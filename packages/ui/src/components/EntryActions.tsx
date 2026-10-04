import { SMALL_BUTTON } from "../constants/ui.ts";
import type { EntryActionsProps } from "../types/props.ts";

/** Undo for a change still in effect, Redo for an undo still in effect. */
export function EntryActions({ entry, actions }: EntryActionsProps) {
  if (!entry.undoable && !entry.redoable) {
    return null;
  }

  return (
    <div className="flex gap-1.5">
      {entry.undoable && (
        <button type="button" className={SMALL_BUTTON} disabled={actions.busy} onClick={() => void actions.undo(entry)}>
          Undo
        </button>
      )}
      {entry.redoable && (
        <button type="button" className={SMALL_BUTTON} disabled={actions.busy} onClick={() => void actions.redo(entry)}>
          Redo
        </button>
      )}
    </div>
  );
}
