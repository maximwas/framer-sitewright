import { appendFile, mkdir, open, readdir, rename } from "node:fs/promises";
import { join } from "node:path";
import { type ActivityEntry, ActivityEntrySchema, type JournalProject } from "@sitewright/core";
import { JOURNAL_TAIL_BYTES } from "../constants/history.ts";
import type { JournalChunk } from "../types/history.ts";
import { withFileLock } from "./file-lock.ts";

/**
 * The activity journal on disk: one JSONL file per project, one entry per line, readable by the user only. Several
 * sitewright processes (Claude Code sessions) share it: they append under a lock and read what the others added.
 * A line that does not parse (a crash mid-write, a future format) is skipped, not fatal.
 */
export class JournalStore {
  readonly #dir: string;

  constructor(dir: string) {
    this.#dir = dir;
  }

  /**
   * Entries from byte `offset` to the last complete line, and the byte they end at. A line still being written is left
   * for the next read. A file other than `file` (cleared by another process and grown again since) or shorter than
   * `offset` was replaced: it is read from the start (`fromStart`).
   */
  async readFrom(projectId: string, offset: number, file: string | null): Promise<JournalChunk> {
    const handle = await open(this.#file(projectId), "r").catch((error: unknown) => {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") {
        return null;
      }

      throw error;
    });

    if (handle === null) {
      return {
        entries: [],
        end: 0,
        fromStart: offset > 0,
        file: null,
      };
    }

    try {
      const { size, dev, ino, birthtimeMs } = await handle.stat();
      const identity = `${dev}:${ino}:${birthtimeMs}`;
      // An unknown file is the one this process created by appending to nothing: its own bytes are in `offset`.
      const replaced = size < offset || (file !== null && file !== identity);
      const start = replaced ? 0 : offset;
      const buffer = Buffer.alloc(size - start);

      await handle.read(buffer, 0, buffer.length, start);

      const complete = buffer.subarray(0, buffer.lastIndexOf(0x0a) + 1);

      return {
        entries: complete.toString("utf8").split("\n").flatMap(parseLine),
        end: start + complete.length,
        fromStart: start !== offset,
        file: identity,
      };
    } finally {
      await handle.close();
    }
  }

  /**
   * The projects with a journal here, the newest change first. The file name is a sanitized id, so the id and the name
   * come from the journal's last entry; a journal without a readable entry is left out.
   */
  async projects(): Promise<JournalProject[]> {
    const files = await readdir(this.#dir).catch(() => []);
    const found = await Promise.all(
      files.filter((file) => file.endsWith(".jsonl")).map((file) => this.#projectOf(join(this.#dir, file))),
    );

    return found.filter((project) => project !== null).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async #projectOf(path: string): Promise<JournalProject | null> {
    const handle = await open(path, "r").catch(() => null);

    if (handle === null) {
      return null;
    }

    try {
      const { size, mtime } = await handle.stat();
      const length = Math.min(size, JOURNAL_TAIL_BYTES);
      const buffer = Buffer.alloc(length);

      await handle.read(buffer, 0, length, size - length);

      const project = buffer
        .toString("utf8")
        .split("\n")
        .reverse()
        .flatMap(parseLine)
        .find((entry) => entry.project !== null)?.project;

      return project === undefined || project === null
        ? null
        : {
            id: project.id,
            name: project.name,
            updatedAt: mtime.toISOString(),
          };
    } finally {
      await handle.close();
    }
  }

  /** Appends one entry; returns how many bytes it took. Call it holding the lock (withLock). */
  async append(projectId: string, entry: ActivityEntry): Promise<number> {
    const line = `${JSON.stringify(entry)}\n`;

    await appendFile(this.#file(projectId), line, { mode: 0o600 });

    return Buffer.byteLength(line);
  }

  /**
   * Starts the project's journal over: the file moves to `archive/` under the time it was cleared, so nothing is lost.
   * Call it holding the lock. Other processes notice the new file and read it from the start.
   */
  async archive(projectId: string, clearedAt: Date): Promise<void> {
    const archive = join(this.#dir, "archive");
    const stamp = clearedAt.toISOString().replace(/[:.]/g, "-");

    await mkdir(archive, {
      recursive: true,
      mode: 0o700,
    });
    await rename(this.#file(projectId), join(archive, `${this.#name(projectId)}-${stamp}.jsonl`)).catch(
      (error: unknown) => {
        if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) {
          throw error;
        }
      },
    );
  }

  /** Runs `task` holding the project file's lock, so appends from several processes never interleave. */
  async withLock<T>(projectId: string, task: () => Promise<T>): Promise<T> {
    await mkdir(this.#dir, {
      recursive: true,
      mode: 0o700,
    });

    return withFileLock(this.#file(projectId), task);
  }

  #file(projectId: string): string {
    return join(this.#dir, `${this.#name(projectId)}.jsonl`);
  }

  #name(projectId: string): string {
    return projectId.replace(/[^A-Za-z0-9_-]/g, "_");
  }
}

function parseLine(line: string): ActivityEntry[] {
  if (line.trim() === "") {
    return [];
  }

  try {
    const parsed = ActivityEntrySchema.safeParse(JSON.parse(line));

    return parsed.success ? [parsed.data] : [];
  } catch {
    return [];
  }
}
