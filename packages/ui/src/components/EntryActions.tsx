import { Button } from "../toolkit/Button.tsx";
import type { EntryActionsProps } from "../types/props.ts";

/** Undo for a change still in effect, Redo for an undo still in effect. */
export function EntryActions({ entry, actions }: EntryActionsProps) {
  if (!entry.undoable && !entry.redoable) {
    return null;
  }

  return (
    <div className="flex gap-1">
      {entry.undoable && (
        <Button size="sm" disabled={actions.busy} onClick={() => void actions.undo(entry)}>
          Undo
        </Button>
      )}
      {entry.redoable && (
        <Button size="sm" disabled={actions.busy} onClick={() => void actions.redo(entry)}>
          Redo
        </Button>
      )}
    </div>
  );
}
