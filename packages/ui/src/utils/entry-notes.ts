import type { ActivitySummary } from "@sitewright/core";

/** Short remarks under an entry's title: who did it, whether it is undone, and what went wrong. */
export function entryNotes(entry: ActivitySummary): string[] {
  const notes: string[] = [];

  if (entry.actor === "user") {
    notes.push("by you");
  }

  if (entry.undone) {
    notes.push("undone");
  }

  if (entry.outcome === "partial") {
    notes.push("partly applied");
  }

  if (entry.conflicts > 0) {
    notes.push(`kept ${entry.conflicts} changed since`);
  }

  if (entry.error !== null) {
    notes.push(entry.error);
  }

  if (entry.incomplete !== null) {
    notes.push(entry.incomplete);
  }

  return notes;
}
