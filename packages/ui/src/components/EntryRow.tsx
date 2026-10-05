import { motion } from "motion/react";
import { FADE } from "../constants/toolkit.ts";
import type { EntryRowProps } from "../types/props.ts";
import { detailLine } from "../utils/entry-detail.ts";
import { formatTime } from "../utils/format-time.ts";
import { isQuiet } from "../utils/quiet-entry.ts";
import { CategoryBadges } from "./CategoryBadges.tsx";
import { ChangeBadges } from "./ChangeBadges.tsx";
import { EntryActions } from "./EntryActions.tsx";
import { EntryDetail } from "./EntryDetail.tsx";
import { EntryIcon } from "./EntryIcon.tsx";
import { EntryNotes } from "./EntryNotes.tsx";
import { ItemChips } from "./ItemChips.tsx";
import { LayerBadge } from "./LayerBadge.tsx";

/**
 * One journal entry, as the site shows it: an icon tile, the title with how it reached Framer, what it read or made in
 * one line, the time or Undo on the right, and what it touched below. A read or a skill is quieter.
 */
export function EntryRow({ entry, actions, readOnly }: EntryRowProps) {
  const quiet = isQuiet(entry);
  const line = entry.detail === null ? null : detailLine(entry.detail);

  return (
    <motion.article
      animate={{ opacity: entry.undone ? 0.55 : 1 }}
      transition={FADE}
      className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-2"
    >
      <EntryIcon entry={entry} />
      <div className="flex min-w-0 flex-col gap-0.5">
        <header className="flex min-w-0 items-center gap-1.5">
          <h2
            className={`min-w-0 truncate text-[13px] ${quiet ? "font-medium text-sw-ink-2" : "font-semibold text-sw-ink"}`}
            title={entry.title}
          >
            {entry.title}
          </h2>
          {entry.layer !== null && <LayerBadge layer={entry.layer} />}
        </header>
        {line !== null && <p className="break-words text-[12px] text-sw-ink-3 leading-snug">{line}</p>}
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <time className="font-mono text-[11px] text-sw-ink-3" dateTime={entry.at}>
          {formatTime(entry.at)}
        </time>
        {!quiet && !readOnly && <EntryActions entry={entry} actions={actions} />}
      </div>
      <div className="col-span-2 col-start-2 flex min-w-0 flex-col gap-1.5 empty:hidden">
        {entry.items.length > 0 && <ChangeBadges items={entry.items} />}
        {entry.categories.length > 0 && <CategoryBadges categories={entry.categories} />}
        <EntryDetail entry={entry} />
        <EntryNotes entry={entry} />
        {entry.items.length > 0 && <ItemChips items={entry.items} />}
      </div>
    </motion.article>
  );
}
