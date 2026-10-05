import { useState } from "react";
import { Button } from "../toolkit/Button.tsx";
import { Sheet } from "../toolkit/Sheet.tsx";
import type { RestoreDialogProps } from "../types/props.ts";
import { RestorePreview } from "./RestorePreview.tsx";

/**
 * Restoring to a checkpoint, in a sheet over the panel: the dry run's preview first. Items changed after Claude changed
 * them stay as they are, unless the user ticks the box to revert them too.
 */
export function RestoreDialog({ flow, state }: RestoreDialogProps) {
  const [force, setForce] = useState(false);
  const conflicts = state?.preview?.conflicts ?? 0;

  return (
    <Sheet open={state !== null} labelledBy="restore-title" onClose={flow.close}>
      {state !== null && (
        <>
          <h2 id="restore-title" className="truncate font-semibold text-[14px] text-sw-ink">
            Restore to “{state.checkpoint.label ?? state.checkpoint.title}”
          </h2>
          <RestorePreview state={state} />
          {conflicts > 0 && (
            <label className="flex items-center gap-2 text-[12px] text-sw-ink">
              <input type="checkbox" checked={force} onChange={(event) => setForce(event.target.checked)} />
              Also revert {conflicts} {conflicts === 1 ? "item" : "items"} changed since
            </label>
          )}
          <div className="flex justify-end gap-1.5">
            <Button variant="ghost" disabled={state.running} onClick={flow.close}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={state.preview === null || state.running}
              onClick={() => void flow.confirm(force)}
            >
              {state.running ? "Restoring…" : "Restore"}
            </Button>
          </div>
        </>
      )}
    </Sheet>
  );
}
