import { Button } from "../toolkit/Button.tsx";
import type { ClearConfirmProps } from "../types/props.ts";

/** Asks before clearing: the changes stay in Framer, but the journal can no longer undo them. */
export function ClearConfirm({ busy, onConfirm, onCancel }: ClearConfirmProps) {
  return (
    <div className="flex flex-col gap-2.5 rounded-xl bg-sw-danger-soft px-3 py-2.5">
      <p className="text-[12px] text-sw-ink">
        Clear the journal? The changes stay in Framer, but you can no longer undo them from here.
      </p>
      <div className="flex gap-1.5">
        <Button variant="danger" disabled={busy} onClick={() => void onConfirm()}>
          Clear
        </Button>
        <Button variant="ghost" disabled={busy} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
