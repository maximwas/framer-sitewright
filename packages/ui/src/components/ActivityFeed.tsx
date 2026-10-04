import type { ActivityFeedProps } from "../types/props.ts";
import { isQuiet } from "../utils/quiet-entry.ts";
import { CheckpointRow } from "./CheckpointRow.tsx";
import { EntryRow } from "./EntryRow.tsx";

/** The journal, newest first: Claude's changes, reads and skills, undos and redos, and checkpoints. */
export function ActivityFeed({ feed, actions, onRestore, emptyText }: ActivityFeedProps) {
  if (feed.status === "idle" || feed.status === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="framer-spinner" />
      </div>
    );
  }

  if (feed.status === "error") {
    return <p>Could not load the activity: {feed.message}</p>;
  }

  const { entries } = feed.value;

  if (entries.length === 0) {
    return <p>{emptyText}</p>;
  }

  return (
    <ol className="-mx-[15px] min-h-0 flex-1 overflow-y-auto border-framer-divider border-t">
      {entries.map((entry) => (
        <li key={entry.id} className={`border-framer-divider border-b px-[15px] ${isQuiet(entry) ? "py-2" : "py-2.5"}`}>
          {entry.kind === "checkpoint" ? (
            <CheckpointRow entry={entry} busy={actions.busy} onRestore={onRestore} />
          ) : (
            <EntryRow entry={entry} actions={actions} />
          )}
        </li>
      ))}
    </ol>
  );
}
