import { REVERT_OUTCOME_LABELS } from "../constants/activity.ts";
import { Spinner } from "../toolkit/Spinner.tsx";
import type { RestorePreviewProps } from "../types/props.ts";
import { previewItems } from "../utils/preview-items.ts";

/** What the restore will do to each item, from its dry run; conflicts (changed since) are marked. */
export function RestorePreview({ state }: RestorePreviewProps) {
  if (state.error !== null) {
    return <p className="text-[12px] text-sw-danger">{state.error}</p>;
  }

  if (state.preview === null) {
    return (
      <div className="flex justify-center py-6">
        <Spinner />
      </div>
    );
  }

  const { reverted, results } = state.preview;
  const items = previewItems(results);

  return (
    <div className="flex min-h-0 flex-col gap-2 text-[12px]">
      <p className="text-sw-ink-2">
        Undoes {reverted.length} {reverted.length === 1 ? "change" : "changes"} made after this checkpoint.
      </p>
      <ul className="flex max-h-60 min-h-0 flex-col divide-y divide-sw-line overflow-y-auto rounded-lg border border-sw-line">
        {items.map((item) => (
          <li key={item.id} className="flex gap-2 px-2.5 py-1.5">
            <span className="min-w-0 flex-1 truncate text-sw-ink">{item.path}</span>
            <span className={`shrink-0 ${item.outcome === "conflict" ? "text-sw-warn" : "text-sw-ink-3"}`}>
              {REVERT_OUTCOME_LABELS[item.outcome]}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
