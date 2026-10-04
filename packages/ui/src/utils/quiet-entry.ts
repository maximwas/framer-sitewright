import type { ActivitySummary } from "@sitewright/core";

/** A read or a skill: an entry that only tells what the AI looked at or followed, shown quieter than a change. */
export function isQuiet(entry: ActivitySummary): boolean {
  return entry.effect === "read" || entry.kind === "skill";
}
