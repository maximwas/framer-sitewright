import { ROW_BUTTON } from "../constants/ui.ts";
import type { ClearConfirmProps } from "../types/props.ts";

/** Asks before clearing: the changes stay in Framer, but the journal can no longer undo them. */
export function ClearConfirm({ busy, onConfirm, onCancel }: ClearConfirmProps) {
  return (
    <div className="flex flex-col gap-2 rounded-lg bg-framer-text-tertiary/10 px-2.5 py-2">
      <p className="text-framer-text">
        Clear the journal? The changes stay in Framer, but you can no longer undo them from here.
      </p>
      <div className="flex gap-2">
        <button type="button" className={ROW_BUTTON} disabled={busy} onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className={`framer-button-primary ${ROW_BUTTON}`}
          disabled={busy}
          onClick={() => void onConfirm()}
        >
          Clear
        </button>
      </div>
    </div>
  );
}
