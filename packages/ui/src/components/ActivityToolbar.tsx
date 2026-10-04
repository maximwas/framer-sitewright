import { ROW_BUTTON } from "../constants/ui.ts";
import type { ActivityToolbarProps } from "../types/props.ts";
import { GearIcon } from "./GearIcon.tsx";

/** Undo the newest change, redo the newest undo, mark a checkpoint, clear the journal, and open the settings. */
export function ActivityToolbar({
  canUndo,
  canRedo,
  canClear,
  busy,
  onUndo,
  onRedo,
  onMark,
  onClear,
  onSettings,
}: ActivityToolbarProps) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        className={ROW_BUTTON}
        disabled={busy || !canUndo}
        title="Undo the newest change"
        onClick={onUndo}
      >
        Undo
      </button>
      <button type="button" className={ROW_BUTTON} disabled={busy || !canRedo} onClick={onRedo}>
        Redo
      </button>
      <button
        type="button"
        className={ROW_BUTTON}
        disabled={busy}
        title="Mark a checkpoint to restore to later"
        onClick={onMark}
      >
        Mark
      </button>
      <button
        type="button"
        className={ROW_BUTTON}
        disabled={busy || !canClear}
        title="Start the journal over: the changes stay in Framer"
        onClick={onClear}
      >
        Clear
      </button>
      <button
        type="button"
        className="grid w-[30px] shrink-0 place-items-center p-0"
        aria-label="Settings"
        title="Settings: what the agent may do"
        onClick={onSettings}
      >
        <GearIcon />
      </button>
    </div>
  );
}
