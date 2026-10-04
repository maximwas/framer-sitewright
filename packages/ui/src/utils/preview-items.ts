import type { RevertReport } from "@sitewright/core";
import type { PreviewItem } from "../types/activity.ts";

/**
 * One row per item for the restore preview. Steps run newest first, so the last result per item is what it ends up
 * as; an item with any conflict stays as it is and shows as a conflict.
 */
export function previewItems(results: RevertReport["results"]): PreviewItem[] {
  const items = new Map<string, PreviewItem>();

  for (const { id, path, outcome } of results) {
    const conflict = outcome === "conflict" || items.get(id)?.outcome === "conflict";

    items.set(id, {
      id,
      path,
      outcome: conflict ? "conflict" : outcome,
    });
  }

  return [...items.values()];
}
