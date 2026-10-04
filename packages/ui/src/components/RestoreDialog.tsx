import { useState } from "react";
import { ROW_BUTTON } from "../constants/ui.ts";
import type { RestoreDialogProps } from "../types/props.ts";
import { RestorePreview } from "./RestorePreview.tsx";

/**
 * Restoring to a checkpoint, over the panel: the dry run's preview first. Items changed after Claude changed them stay
 * as they are, unless the user ticks the box to revert them too.
 */
export function RestoreDialog({ flow, state }: RestoreDialogProps) {
  const [force, setForce] = useState(false);
  const conflicts = state.preview?.conflicts ?? 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="restore-title"
      className="absolute inset-0 z-10 flex flex-col gap-3 bg-framer-bg px-[15px] pb-[15px]"
    >
      <h2 id="restore-title" className="truncate font-semibold text-framer-text">
        Restore to “{state.checkpoint.label ?? state.checkpoint.title}”
      </h2>
      <RestorePreview state={state} />
      {conflicts > 0 && (
        <label className="flex items-center gap-2 text-framer-text">
          <input type="checkbox" checked={force} onChange={(event) => setForce(event.target.checked)} />
          Also revert {conflicts} {conflicts === 1 ? "item" : "items"} changed since
        </label>
      )}
      <div className="flex gap-2">
        <button type="button" className={ROW_BUTTON} disabled={state.running} onClick={flow.close}>
          Cancel
        </button>
        <button
          type="button"
          className={`framer-button-primary ${ROW_BUTTON}`}
          disabled={state.preview === null || state.running}
          onClick={() => void flow.confirm(force)}
        >
          {state.running ? "Restoring…" : "Restore"}
        </button>
      </div>
    </div>
  );
}
