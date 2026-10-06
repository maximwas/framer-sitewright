import { chmod, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { BriefFileSchema } from "../schemas/brief.ts";
import type { BriefAnswers, StoredBrief } from "../types/brief.ts";
import type { ProjectRef } from "../types/transports.ts";

/**
 * Each project's brief (project_brief), one file per project in briefs/, readable by the user only: it may hold a
 * client's plans. Saving merges new answers into the saved ones, so the brief grows round by round and outlives the
 * conversation. A missing or broken file means no brief yet.
 */
export class BriefStore {
  readonly #dir: string;
  /** This process's saves run one after another, each on what the one before wrote. */
  #queue: Promise<unknown> = Promise.resolve();

  constructor(dir: string) {
    this.#dir = dir;
  }

  async get(projectId: string): Promise<StoredBrief | null> {
    try {
      return BriefFileSchema.parse(JSON.parse(await readFile(this.#file(projectId), "utf8")));
    } catch {
      return null;
    }
  }

  /** Merges `answers` into the saved brief (or into none, with `reset`) and returns what is saved now. */
  save(project: ProjectRef, answers: BriefAnswers, reset: boolean): Promise<StoredBrief> {
    const run = this.#queue.then(async () => {
      const saved = reset ? null : await this.get(project.id);
      const brief: StoredBrief = {
        version: 1,
        project,
        updatedAt: new Date().toISOString(),
        answers: {
          ...saved?.answers,
          ...answers,
        },
      };

      await this.#write(project.id, brief);

      return brief;
    });

    this.#queue = run.catch(() => undefined);

    return run;
  }

  async #write(projectId: string, brief: StoredBrief): Promise<void> {
    const file = this.#file(projectId);
    const temporary = `${file}.${process.pid}.tmp`;

    await mkdir(this.#dir, {
      recursive: true,
      mode: 0o700,
    });
    await writeFile(temporary, `${JSON.stringify(brief, null, 2)}\n`, { mode: 0o600 });
    await chmod(temporary, 0o600);
    await rename(temporary, file);
  }

  #file(projectId: string): string {
    return join(this.#dir, `${projectId.replace(/[^A-Za-z0-9_-]/g, "_")}.json`);
  }
}
