import type { Journal, UndoStep } from "../types/history.ts";

/**
 * Collects the undo steps of one operation run. Operations receive it through their context and record what
 * really changed, so the journal can undo it later. `incomplete` means some change may be missing; `remap` is where
 * a revert says which new id replaced an item it recreated.
 */
export class HistoryRecorder {
  readonly #steps: UndoStep[] = [];
  readonly #incomplete = new Set<string>();
  readonly #remap = new Map<string, string>();

  get steps(): readonly UndoStep[] {
    return this.#steps;
  }

  /** Why the recorded steps may miss a change, or null when they are complete. */
  get incomplete(): string | null {
    return this.#incomplete.size === 0 ? null : [...this.#incomplete].join(" ");
  }

  /** Old id → new id of every item the run recreated. */
  get remap(): Readonly<Record<string, string>> {
    return Object.fromEntries(this.#remap);
  }

  record(step: UndoStep): void {
    this.#steps.push(step);
  }

  markIncomplete(reason: string): void {
    this.#incomplete.add(reason);
  }

  recordRemap(oldId: string, newId: string): void {
    this.#remap.set(oldId, newId);
  }

  /** Takes in a journal recorded elsewhere, e.g. by the Framer plugin, which ran the operation. */
  absorb(journal: Journal): void {
    for (const step of journal.steps) {
      this.record(step);
    }

    if (journal.incomplete !== null) {
      this.markIncomplete(journal.incomplete);
    }

    for (const [oldId, newId] of Object.entries(journal.remap)) {
      this.recordRemap(oldId, newId);
    }
  }
}

/** A snapshot of what the recorder holds, for the journal and for the bridge. */
function journalOf(history: HistoryRecorder): Journal {
  return {
    steps: [...history.steps],
    incomplete: history.incomplete,
    remap: history.remap,
  };
}

/** An operation failed after recording some changes: the journal must still learn what was applied. */
export class JournaledError extends Error {
  readonly journal: Journal;

  constructor(cause: unknown, journal: Journal) {
    super(cause instanceof Error ? cause.message : String(cause), { cause });
    this.name = "JournaledError";
    this.journal = journal;
  }
}

/** Runs `run` with a fresh recorder and returns its output with the journal; a failure carries the journal too. */
export async function withJournal<T>(
  run: (history: HistoryRecorder) => Promise<T>,
): Promise<{ output: T; journal: Journal }> {
  const history = new HistoryRecorder();

  try {
    return {
      output: await run(history),
      journal: journalOf(history),
    };
  } catch (error) {
    throw new JournaledError(error, journalOf(history));
  }
}
