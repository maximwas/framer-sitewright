import { readFileSync, statSync } from "node:fs";
import { chmod, mkdir, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { KeyFileSchema } from "../schemas/keys.ts";
import type { ProjectKey, StoredProject } from "../types/keys.ts";

/**
 * The Server API keys of the user's projects, one per project, in keys.json (readable by the user only). Every
 * Sitewright process and the CLI share the file: reads follow it by modification time, writes replace it whole, so no
 * reader sees half a file. A missing or broken file means no keys.
 */
export class KeyStore {
  readonly #file: string;
  #cache: { readonly mtimeMs: number; readonly projects: Record<string, StoredProject> } | null = null;
  /** The last change in flight: this process's changes run one after another, each on what the one before wrote. */
  #queue: Promise<void> = Promise.resolve();

  constructor(file: string) {
    this.#file = file;
  }

  /** The saved projects, in the order they were added. */
  list(): StoredProject[] {
    return Object.values(this.#read()).sort((a, b) => a.addedAt.localeCompare(b.addedAt));
  }

  get(projectId: string): StoredProject | null {
    return this.#read()[projectId] ?? null;
  }

  /** The project used last, for a session without the plugin. */
  lastUsed(): StoredProject | null {
    return this.list().sort((a, b) => (b.lastUsedAt ?? b.addedAt).localeCompare(a.lastUsedAt ?? a.addedAt))[0] ?? null;
  }

  set(project: ProjectKey): Promise<void> {
    return this.#update((projects) => {
      const now = new Date().toISOString();

      return {
        ...projects,
        [project.id]: {
          ...project,
          addedAt: projects[project.id]?.addedAt ?? now,
          lastUsedAt: now,
        },
      };
    });
  }

  touch(projectId: string): Promise<void> {
    return this.#update((projects) => {
      const project = projects[projectId];

      return project === undefined
        ? null
        : {
            ...projects,
            [projectId]: {
              ...project,
              lastUsedAt: new Date().toISOString(),
            },
          };
    });
  }

  /** Forgets a project's key; false when there was none. */
  async remove(projectId: string): Promise<boolean> {
    let removed = false;

    await this.#update(({ [projectId]: project, ...rest }) => {
      removed = project !== undefined;

      return removed ? rest : null;
    });

    return removed;
  }

  /**
   * Reads, changes and writes the file after this process's earlier changes, so two that overlap neither share the
   * temporary file nor lose each other. `change` returns null to leave the file as it is.
   */
  #update(change: (projects: Record<string, StoredProject>) => Record<string, StoredProject> | null): Promise<void> {
    const run = this.#queue.then(async () => {
      const projects = change(this.#read());

      if (projects !== null) {
        await this.#write(projects);
      }
    });

    this.#queue = run.catch(() => undefined);

    return run;
  }

  #read(): Record<string, StoredProject> {
    let mtimeMs: number;

    try {
      mtimeMs = statSync(this.#file).mtimeMs;
    } catch {
      return {};
    }

    if (this.#cache?.mtimeMs !== mtimeMs) {
      this.#cache = {
        mtimeMs,
        projects: parse(this.#file),
      };
    }

    return { ...this.#cache.projects };
  }

  async #write(projects: Record<string, StoredProject>): Promise<void> {
    const temporary = `${this.#file}.${process.pid}.tmp`;

    await mkdir(dirname(this.#file), {
      recursive: true,
      mode: 0o700,
    });
    await writeFile(
      temporary,
      `${JSON.stringify(
        {
          version: 1,
          projects,
        },
        null,
        2,
      )}\n`,
      { mode: 0o600 },
    );
    await chmod(temporary, 0o600);
    await rename(temporary, this.#file);
    this.#cache = null;
  }
}

function parse(file: string): Record<string, StoredProject> {
  try {
    const parsed = KeyFileSchema.safeParse(JSON.parse(readFileSync(file, "utf8")));

    return parsed.success ? parsed.data.projects : {};
  } catch {
    return {};
  }
}
