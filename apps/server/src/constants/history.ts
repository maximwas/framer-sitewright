/** Added to an entry whose call failed in a way that may still have changed the project (see outcomeUnknown). */
export const UNKNOWN_OUTCOME_NOTE =
  "The call failed without a clear outcome (a timeout, or the plugin went away), so it may have changed the project without undo steps. Re-read the project before relying on the journal.";

/**
 * The journal file's lock: several Claude Code sessions (processes) append to the same file. A process retries this
 * often, gives up after the wait, and breaks a lock older than the stale age: its owner died mid-write.
 */
export const JOURNAL_LOCK_RETRY_MS = 15;

export const JOURNAL_LOCK_WAIT_MS = 5000;

export const JOURNAL_LOCK_STALE_MS = 10_000;
