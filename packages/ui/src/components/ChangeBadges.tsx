import { BADGE_TEXT, CHANGE_BADGES } from "../constants/ui.ts";
import type { ChangeBadgesProps } from "../types/props.ts";
import { changeCounts } from "../utils/change-counts.ts";

/** How many items the entry created, updated and deleted, as badges; deletions in red. */
export function ChangeBadges({ items }: ChangeBadgesProps) {
  const counts = changeCounts(items);

  if (counts.length === 0) {
    return null;
  }

  return (
    <ul className="flex flex-wrap gap-1">
      {counts.map(({ change, count }) => {
        const { icon: Icon, label, className } = CHANGE_BADGES[change];

        return (
          <li
            key={change}
            className={`flex h-5 items-center gap-1 rounded-full px-2 font-semibold text-[10px] ${className}`}
          >
            <Icon aria-hidden className="size-3 shrink-0" />
            <span className={BADGE_TEXT}>
              {count} {label}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
