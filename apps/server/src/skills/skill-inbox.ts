import { type FSWatcher, mkdirSync, readdirSync, unlinkSync, watch, writeFileSync } from "node:fs";
import { open } from "node:fs/promises";
import { join } from "node:path";
import { SKILL_INBOX_FILE } from "../constants/skills.ts";
import { SkillNoteSchema } from "../schemas/skills.ts";
import type { SkillNote } from "../types/skills.ts";
import { inboxPrefix } from "../utils/skill-note.ts";

/**
 * Where the `hook` command leaves the skills the AI activates in one Claude Code session. Claude Code tells every
 * process it starts which session it belongs to (CLAUDE_CODE_SESSION_ID), and tells hooks the same id, so each
 * sitewright process reads the skills of its own conversation and journals them for its own project. One file per
 * process (`<session>.<pid>.jsonl`), so two MCP servers of one conversation do not share it; the hook appends to all of
 * them. The file goes with its process; files of processes that died are swept when the next one opens its inbox.
 */
export class SkillInbox {
  readonly #file: string;
  readonly #onNote: (note: SkillNote) => void;
  readonly #watcher: FSWatcher;
  #offset = 0;
  #reading: Promise<void> = Promise.resolve();

  static open(dir: string, sessionId: string, onNote: (note: SkillNote) => void): SkillInbox {
    mkdirSync(dir, {
      recursive: true,
      mode: 0o700,
    });
    sweepDeadInboxes(dir);

    const file = join(dir, `${inboxPrefix(sessionId)}${process.pid}.jsonl`);

    writeFileSync(file, "", {
      mode: 0o600,
      flag: "a",
    });

    return new SkillInbox(file, onNote);
  }

  private constructor(file: string, onNote: (note: SkillNote) => void) {
    this.#file = file;
    this.#onNote = onNote;
    this.#watcher = watch(file, () => void this.drain());
    // A watcher error (the file went away) only stops the inbox; it must never take the MCP server down.
    this.#watcher.on("error", () => this.#watcher.close());
  }

  /** Hands over every complete line written since the last read, in order. */
  drain(): Promise<void> {
    this.#reading = this.#reading.then(() => this.#read()).catch(() => undefined);

    return this.#reading;
  }

  /** Stops listening and removes the file, so hooks of this session stop writing to it. */
  close(): void {
    this.#watcher.close();

    try {
      unlinkSync(this.#file);
    } catch {
      // Already gone.
    }
  }

  async #read(): Promise<void> {
    const handle = await open(this.#file, "r");

    try {
      const { size } = await handle.stat();
      const buffer = Buffer.alloc(Math.max(0, size - this.#offset));

      await handle.read(buffer, 0, buffer.length, this.#offset);

      const complete = buffer.subarray(0, buffer.lastIndexOf(0x0a) + 1);

      this.#offset += complete.length;

      for (const line of complete.toString("utf8").split("\n")) {
        const note = parseNote(line);

        if (note !== null) {
          this.#onNote(note);
        }
      }
    } finally {
      await handle.close();
    }
  }
}

function parseNote(line: string): SkillNote | null {
  if (line.trim() === "") {
    return null;
  }

  try {
    const parsed = SkillNoteSchema.safeParse(JSON.parse(line));

    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Removes the inboxes of processes that are gone (crashed, killed): nothing reads them any more. */
function sweepDeadInboxes(dir: string): void {
  for (const name of readdirSync(dir)) {
    const pid = Number(SKILL_INBOX_FILE.exec(name)?.[2] ?? Number.NaN);

    if (Number.isInteger(pid) && !isAlive(pid)) {
      try {
        unlinkSync(join(dir, name));
      } catch {
        // Another process swept it first.
      }
    }
  }
}

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);

    return true;
  } catch (error) {
    // EPERM: the process exists but belongs to someone else.
    return error instanceof Error && "code" in error && error.code === "EPERM";
  }
}
