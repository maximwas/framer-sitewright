import type { ActivityEntry } from "@sitewright/core";
import type { JournalStore } from "./journal-store.ts";

/**
 * One project's journal as this process sees it. Every Claude Code session runs its own sitewright process, and they
 * all write the same file: each read first takes in what the others appended, and each append happens under the file
 * lock, with the next sequence number. Reads and appends of this process run one at a time, in order.
 */
export class ProjectLog {
  readonly #store: JournalStore;
  readonly #projectId: string;
  #entries: ActivityEntry[] = [];
  #end = 0;
  /** The file `#end` counts bytes of (see JournalStore.readFrom). */
  #file: string | null = null;
  #queue: Promise<unknown> = Promise.resolve();

  constructor(store: JournalStore, projectId: string) {
    this.#store = store;
    this.#projectId = projectId;
  }

  /** The entries, oldest first, up to what any process has written. */
  entries(): Promise<readonly ActivityEntry[]> {
    return this.#serial(async () => {
      await this.#catchUp();

      return this.#entries;
    });
  }

  /** Appends the entry `build` makes for the next sequence number, and returns it. */
  append(build: (seq: number) => ActivityEntry): Promise<ActivityEntry> {
    return this.#serial(() =>
      this.#store.withLock(this.#projectId, async () => {
        await this.#catchUp();

        const entry = build((this.#entries.at(-1)?.seq ?? 0) + 1);

        this.#end += await this.#store.append(this.#projectId, entry);
        this.#entries = [...this.#entries, entry];

        return entry;
      }),
    );
  }

  /** Starts the journal over (the old one is archived); returns how many entries it held. */
  clear(clearedAt: Date): Promise<number> {
    return this.#serial(() =>
      this.#store.withLock(this.#projectId, async () => {
        await this.#catchUp();

        const count = this.#entries.length;

        await this.#store.archive(this.#projectId, clearedAt);
        this.#entries = [];
        this.#end = 0;
        this.#file = null;

        return count;
      }),
    );
  }

  async #catchUp(): Promise<void> {
    const chunk = await this.#store.readFrom(this.#projectId, this.#end, this.#file);

    this.#entries = chunk.fromStart ? [...chunk.entries] : [...this.#entries, ...chunk.entries];
    this.#end = chunk.end;
    this.#file = chunk.file;
  }

  /** A failed step does not stop the ones queued after it. */
  #serial<T>(task: () => Promise<T>): Promise<T> {
    const result = this.#queue.then(task);

    this.#queue = result.catch(() => undefined);

    return result;
  }
}
