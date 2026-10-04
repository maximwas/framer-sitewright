import type { RevertReport } from "@sitewright/core";

/** One line on what an undo, redo or restore did, for its notification. */
export function describeReport(report: RevertReport): string {
  const title = report.entry?.title ?? "Nothing changed";

  return `${title}.${keptNote(report.conflicts)}`;
}

function keptNote(conflicts: number): string {
  if (conflicts === 0) {
    return "";
  }

  return conflicts === 1 ? " 1 item changed since was kept." : ` ${conflicts} items changed since were kept.`;
}
