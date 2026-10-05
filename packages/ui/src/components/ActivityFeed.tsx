import { CircleAlert, History } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef } from "react";
import { STAGGERED_ROWS } from "../constants/activity.ts";
import { EASE_OUT } from "../constants/toolkit.ts";
import { EmptyState } from "../toolkit/EmptyState.tsx";
import { Spinner } from "../toolkit/Spinner.tsx";
import type { ActivityList } from "../types/activity.ts";
import type { ActivityFeedProps } from "../types/props.ts";
import { CheckpointRow } from "./CheckpointRow.tsx";
import { EntryRow } from "./EntryRow.tsx";

/**
 * The journal, newest first: Claude's changes, reads and skills, undos and redos, and checkpoints. New entries slide
 * in at the top, the others make room, and the newest change that can be undone is highlighted.
 */
export function ActivityFeed({ feed, actions, onRestore, emptyText, readOnly }: ActivityFeedProps) {
  // The first list shown comes in row after row; after that, only new rows animate in.
  const staggered = useRef(true);
  // While another view or project loads, the last list stays (dimmed), so the rows change in place instead of the
  // whole list vanishing behind a spinner.
  const lastReady = useRef<ActivityList | null>(null);

  useEffect(() => {
    if (feed.status === "ready") {
      staggered.current = false;
      lastReady.current = feed.value;
    }
  });

  const shown = feed.status === "ready" ? feed.value : feed.status === "loading" ? lastReady.current : null;

  if (shown === null && feed.status !== "error") {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (feed.status === "error" || shown === null) {
    return (
      <EmptyState icon={CircleAlert}>
        Could not load the activity: {feed.status === "error" ? feed.message : "no answer"}
      </EmptyState>
    );
  }

  const { entries } = shown;
  const stale = feed.status !== "ready";

  if (entries.length === 0) {
    return <EmptyState icon={History}>{emptyText}</EmptyState>;
  }

  const first = staggered.current;
  const highlight = readOnly ? undefined : entries.find((entry) => entry.undoable)?.id;

  return (
    <motion.ol
      layoutScroll
      aria-busy={stale}
      animate={{ opacity: stale ? 0.5 : 1 }}
      className={`-mx-3 min-h-0 flex-1 overflow-y-auto px-2 pb-3 ${stale ? "pointer-events-none" : ""}`}
    >
      <AnimatePresence mode="popLayout">
        {entries.map((entry, index) => {
          const lit = entry.id === highlight;
          const afterLit = entries[index - 1]?.id === highlight;

          return (
            <motion.li
              key={entry.id}
              layout="position"
              initial={{
                opacity: 0,
                y: -10,
              }}
              animate={{
                opacity: 1,
                y: 0,
                transition: {
                  duration: 0.4,
                  ease: EASE_OUT,
                  delay: first ? Math.min(index, STAGGERED_ROWS) * 0.035 : 0,
                },
              }}
              exit={{
                opacity: 0,
                x: 32,
                transition: {
                  duration: 0.25,
                  ease: EASE_OUT,
                },
              }}
              transition={{
                layout: {
                  duration: 0.35,
                  ease: EASE_OUT,
                },
              }}
              className={`border-t px-2.5 py-2.5 transition-colors ${
                lit
                  ? "rounded-xl border-transparent bg-sw-accent-soft"
                  : index === 0 || afterLit
                    ? "border-transparent"
                    : "border-sw-line"
              }`}
            >
              {entry.kind === "checkpoint" ? (
                <CheckpointRow entry={entry} busy={actions.busy} readOnly={readOnly} onRestore={onRestore} />
              ) : (
                <EntryRow entry={entry} actions={actions} readOnly={readOnly} />
              )}
            </motion.li>
          );
        })}
      </AnimatePresence>
    </motion.ol>
  );
}
