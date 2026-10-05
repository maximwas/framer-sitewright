import { Flag } from "lucide-react";
import { Button } from "../toolkit/Button.tsx";
import type { CheckpointRowProps } from "../types/props.ts";
import { formatTime } from "../utils/format-time.ts";

/** A checkpoint: where a task started, as a dashed line across the journal. Restore undoes every change after it. */
export function CheckpointRow({ entry, busy, readOnly, onRestore }: CheckpointRowProps) {
  return (
    <article className="flex min-w-0 items-center gap-2">
      <Flag aria-hidden className="size-3.5 shrink-0 text-sw-accent" />
      <h2
        className="min-w-0 truncate font-semibold text-[11px] text-sw-ink-3 uppercase tracking-[0.06em]"
        title={entry.title}
      >
        Checkpoint · {entry.label ?? entry.title}
      </h2>
      <span aria-hidden className="min-w-4 flex-1 border-sw-line-strong border-t border-dashed" />
      <time className="shrink-0 font-mono text-[11px] text-sw-ink-3" dateTime={entry.at}>
        {formatTime(entry.at)}
      </time>
      {!readOnly && (
        <Button
          size="sm"
          variant="ghost"
          disabled={busy}
          title="Undo every change made after this checkpoint"
          onClick={() => onRestore(entry)}
        >
          Restore
        </Button>
      )}
    </article>
  );
}
