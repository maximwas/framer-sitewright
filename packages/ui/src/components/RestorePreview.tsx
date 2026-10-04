import { REVERT_OUTCOME_LABELS } from "../constants/activity.ts";
import type { RestorePreviewProps } from "../types/props.ts";
import { previewItems } from "../utils/preview-items.ts";

/** What the restore will do to each item, from its dry run; conflicts (changed since) are marked. */
export function RestorePreview({ state }: RestorePreviewProps) {
  if (state.error !== null) {
    return <p className="text-red-500">{state.error}</p>;
  }

  if (state.preview === null) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="framer-spinner" />
      </div>
    );
  }

  const { reverted, results } = state.preview;
  const items = previewItems(results);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <p>
        Undoes {reverted.length} {reverted.length === 1 ? "change" : "changes"} made after this checkpoint.
      </p>
      <ul className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
        {items.map((item) => (
          <li key={item.id} className="flex gap-2">
            <span className="min-w-0 flex-1 truncate text-framer-text">{item.path}</span>
            <span
              className={`shrink-0 ${item.outcome === "conflict" ? "text-amber-600" : "text-framer-text-secondary"}`}
            >
              {REVERT_OUTCOME_LABELS[item.outcome]}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
