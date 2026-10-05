import { useState } from "react";
import { CHIP_LIMIT } from "../constants/activity.ts";
import type { ItemChipsProps } from "../types/props.ts";
import { ItemChip } from "./ItemChip.tsx";

/** What an entry changed, as chips; a long list folds after a few, and "+N more" unfolds all of it. */
export function ItemChips({ items, read = false }: ItemChipsProps) {
  const [open, setOpen] = useState(false);
  const shown = open ? items : items.slice(0, CHIP_LIMIT);
  const hidden = items.length - CHIP_LIMIT;

  return (
    <ul className="flex flex-wrap gap-1">
      {shown.map((item) => (
        <li key={`${item.kind}:${item.id}`} className="max-w-full">
          <ItemChip item={item} read={read} />
        </li>
      ))}
      {hidden > 0 && (
        <li className="self-center">
          <button
            type="button"
            className="h-auto w-auto border-0 bg-transparent p-0 font-semibold text-[11px] text-sw-ink-3 hover:text-sw-ink"
            onClick={() => setOpen(!open)}
          >
            {open ? "Show less" : `+${hidden} more`}
          </button>
        </li>
      )}
    </ul>
  );
}
