import type { EntryRowProps } from "../types/props.ts";
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
 * One journal entry: what happened and when, how it reached Framer, what it touched, and Undo or Redo when they apply.
 * A read or a skill is quieter: an eye or a book instead of the outcome dot (unless it failed), a plain title, no
 * actions.
 */
export function EntryRow({ entry, actions, readOnly }: EntryRowProps) {
  const quiet = isQuiet(entry);

  return (
    <article className={`flex flex-col gap-1.5 ${entry.undone ? "opacity-60" : ""}`}>
      <header className="flex items-center gap-2">
        <EntryIcon entry={entry} />
        <h2
          className={`min-w-0 flex-1 truncate ${quiet ? "text-framer-text-secondary" : "font-semibold text-framer-text"}`}
          title={entry.title}
        >
          {entry.title}
        </h2>
        {entry.layer !== null && <LayerBadge layer={entry.layer} />}
        <time className="shrink-0 text-framer-text-tertiary" dateTime={entry.at}>
          {formatTime(entry.at)}
        </time>
      </header>
      <div className="flex flex-col gap-1.5 pl-[22px]">
        {entry.items.length > 0 && <ChangeBadges items={entry.items} />}
        {entry.categories.length > 0 && <CategoryBadges categories={entry.categories} />}
        <EntryDetail entry={entry} />
        <EntryNotes entry={entry} />
        {entry.items.length > 0 && <ItemChips items={entry.items} />}
        {!quiet && !readOnly && <EntryActions entry={entry} actions={actions} />}
      </div>
    </article>
  );
}
