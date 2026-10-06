import {
  type ActivityActor,
  type ActivityCall,
  type ActivityEntry,
  type ActivityView,
  isRedoable,
  isUndoable,
  refOf,
  revertState,
  summarizeEntry,
} from "@sitewright/core";
import type { ProjectRef } from "../types/transports.ts";
import type { ActivityJournal } from "./activity-journal.ts";
import type { ActivityUndo } from "./activity-undo.ts";

/**
 * The project's journal as lists show it, newest first: the changes (writes, reverts, checkpoints), only the reads, or
 * all of it. Filtered before the limit, so a run of reads never pushes the changes out of the list. Whether undo, redo
 * and clear have anything to do is told for the whole journal, whatever the view shows.
 */
export async function listActivity(
  journal: ActivityJournal,
  { limit, show, project: picked }: { readonly limit: number; readonly show: ActivityView; readonly project?: string },
  shown?: ProjectRef,
) {
  const current = shown ?? (await journal.currentProject());
  // Another project's journal (the page's project switch) names itself through its entries.
  const pickedEntries = picked === undefined ? null : await journal.entries(picked);
  const entries = pickedEntries ?? (current === null ? [] : await journal.entries(current.id));
  const project =
    picked === undefined
      ? current
      : {
          id: picked,
          name: entries.findLast((entry) => entry.project !== null)?.project?.name ?? picked,
        };
  const state = revertState(entries);

  return {
    project,
    entries: entries
      .filter((entry) => inView(entry, show))
      .slice(-limit)
      .reverse()
      .map((entry) => summarizeEntry(entry, state)),
    canUndo: entries.some((entry) => isUndoable(entry, state)),
    canRedo: entries.some((entry) => isRedoable(entry, state)),
    total: entries.length,
  };
}

function inView(entry: ActivityEntry, show: ActivityView): boolean {
  switch (show) {
    case "all":
      return true;
    case "changes":
      // The skills stay: they tell what the AI followed for the changes after them.
      return entry.effect !== "read";
    case "cms":
      return (entry.operation ?? "").startsWith("cms.") || entry.steps.some((step) => step.kind === "cms-item");
    case "reads":
      return entry.effect === "read";
    case "skills":
      return entry.kind === "skill";
  }
}

/**
 * One journal action, the same for MCP tools (the AI) and for calls from the plugin window (the user). `shown`: the
 * project the plugin window is open in, which may not be the one this session works on.
 */
export async function handleActivityCall(
  call: ActivityCall,
  journal: ActivityJournal,
  undo: ActivityUndo,
  actor: ActivityActor,
  shown?: ProjectRef,
) {
  switch (call.method) {
    case "activity.list":
      return listActivity(journal, call.params, shown);
    case "activity.undo":
      return undo.undo(
        call.params.entryId,
        {
          ...call.params,
          actor,
        },
        call.params.andLater,
        shown,
      );
    case "activity.redo":
      return undo.redo(
        call.params.entryId,
        {
          ...call.params,
          actor,
        },
        shown,
      );
    case "activity.restore":
      return undo.restore(
        call.params.checkpointId,
        {
          ...call.params,
          actor,
        },
        shown,
      );
    case "activity.checkpoint": {
      const entry = await journal.checkpoint(call.params.label, actor, shown);

      return { checkpoint: entry === null ? null : refOf(entry) };
    }
    case "activity.clear": {
      // Clearing is local: any project's journal can start over, the plugin need not be open in it.
      if (call.params.project === undefined) {
        return { cleared: await journal.clear(shown) };
      }

      const { project } = call.params;
      const picked = (await journal.projects()).find((known) => known.id === project);

      return { cleared: picked === undefined ? 0 : await journal.clear(picked) };
    }
  }
}
