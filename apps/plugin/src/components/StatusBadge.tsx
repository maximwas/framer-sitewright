import { STATUS_BADGE_COLORS, STATUS_DOT_COLORS } from "../constants/ui.ts";
import type { StatusBadgeProps } from "../types/ui.ts";

/** The bridge state as a pill: green while Claude Code can reach the project. */
export function StatusBadge({ title, tone }: StatusBadgeProps) {
  return (
    <h1
      role="status"
      className={`flex min-w-0 items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold text-[11px] ${STATUS_BADGE_COLORS[tone]}`}
    >
      <span aria-hidden className={`size-1.5 shrink-0 rounded-full ${STATUS_DOT_COLORS[tone]}`} />
      <span className="truncate">{title}</span>
    </h1>
  );
}
