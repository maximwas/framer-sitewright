import { Flag, Redo2, Settings, Trash2, Undo2 } from "lucide-react";
import { Button } from "../toolkit/Button.tsx";
import { IconButton } from "../toolkit/IconButton.tsx";
import type { ActivityToolbarProps } from "../types/props.ts";

/** Undo the newest change, redo the newest undo, mark a checkpoint, clear the journal, and open the settings. */
export function ActivityToolbar({
  readOnly,
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
    <div className="flex min-w-0 items-center gap-1.5">
      <Button icon={Undo2} disabled={busy || readOnly || !canUndo} title="Undo the newest change" onClick={onUndo}>
        Undo
      </Button>
      <Button icon={Redo2} disabled={busy || readOnly || !canRedo} title="Redo the newest undo" onClick={onRedo}>
        Redo
      </Button>
      <Button icon={Flag} disabled={busy || readOnly} title="Mark a checkpoint to restore to later" onClick={onMark}>
        Mark
      </Button>
      <Button
        icon={Trash2}
        variant="ghost"
        disabled={busy || readOnly || !canClear}
        title="Start the journal over: the changes stay in Framer"
        onClick={onClear}
      >
        Clear
      </Button>
      <IconButton icon={Settings} label="Settings: what the agent may do" className="ml-auto" onClick={onSettings} />
    </div>
  );
}
