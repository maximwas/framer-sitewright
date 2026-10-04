import type { EntryNotesProps } from "../types/props.ts";
import { entryNotes } from "../utils/entry-notes.ts";

/** Who made the entry, whether it is undone, and what went wrong, in one line. */
export function EntryNotes({ entry }: EntryNotesProps) {
  const notes = entryNotes(entry);

  if (notes.length === 0) {
    return null;
  }

  return <p className="break-words">{notes.join(" · ")}</p>;
}
