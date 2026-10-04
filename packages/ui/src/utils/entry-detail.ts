import type { ActivityDetail, ActivitySummary } from "@sitewright/core";
import type { ActivityItem } from "../types/activity.ts";

/** "Hero, depth 2 · 24 nodes": the subject and the result, or null when the entry has neither. */
export function detailLine(detail: ActivityDetail): string | null {
  const parts = [detail.subject, detail.summary].filter((part) => part !== null);

  return parts.length === 0 ? null : parts.join(" · ");
}

/** The detail's nodes as plain chips, leaving out those the entry's change chips show already. */
export function detailNodeItems(entry: ActivitySummary): ActivityItem[] {
  const shown = new Set(entry.items.map((item) => item.id));

  return (entry.detail?.nodes ?? [])
    .filter((node) => !shown.has(node.id))
    .map((node) => ({
      kind: "node",
      id: node.id,
      path: node.name,
      change: "updated",
      swatch: null,
      categories: [],
    }));
}
