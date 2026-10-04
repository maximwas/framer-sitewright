import { SMALL_BUTTON } from "../constants/ui.ts";
import type { CheckpointRowProps } from "../types/props.ts";
import { formatTime } from "../utils/format-time.ts";

/** A checkpoint: where a task started. Restore undoes every change made after it. */
export function CheckpointRow({ entry, busy, onRestore }: CheckpointRowProps) {
  return (
    <article className="flex items-center gap-2">
      <span aria-hidden className="w-2 shrink-0 text-center text-framer-tint">
        ⚑
      </span>
      <h2 className="min-w-0 flex-1 truncate font-semibold text-framer-text" title={entry.title}>
        {entry.label ?? entry.title}
      </h2>
      <time className="shrink-0 text-framer-text-tertiary" dateTime={entry.at}>
        {formatTime(entry.at)}
      </time>
      <button
        type="button"
        className={SMALL_BUTTON}
        disabled={busy}
        title="Undo every change made after this checkpoint"
        onClick={() => onRestore(entry)}
      >
        Restore
      </button>
    </article>
  );
}
