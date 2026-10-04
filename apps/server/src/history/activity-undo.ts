import {
  type ActivityEntry,
  aliasesOf,
  applyAliases,
  errorMessage,
  HistoryRecorder,
  historyRevert,
  isRedoable,
  isUndoable,
  OperationError,
  type RevertReport,
  refOf,
  restoreTargets,
  revertState,
  revertTitle,
} from "@sitewright/core";
import { UNKNOWN_OUTCOME_NOTE } from "../constants/history.ts";
import type { RevertKind, RevertRecord, RevertRequest } from "../types/history.ts";
import type { CallTrace, ProjectRef } from "../types/transports.ts";
import { layerOf } from "../utils/activity-layer.ts";
import type { ActivityJournal } from "./activity-journal.ts";
import { outcomeUnknown } from "./outcome.ts";

/** Undo, redo and restore over the activity journal. Every revert is journaled too, so it can be undone in turn. */
export class ActivityUndo {
  readonly #journal: ActivityJournal;

  constructor(journal: ActivityJournal) {
    this.#journal = journal;
  }

  /**
   * Undoes the given entry, or the newest change that is not undone yet. `andLater` undoes every change after it too,
   * in one revert, so the project is back to how it was before the entry (restoreTargets).
   */
  undo(
    entryId: string | undefined,
    request: RevertRequest,
    andLater = false,
    project?: ProjectRef,
  ): Promise<RevertReport> {
    return this.#journal.exclusive(async () => {
      const entries = await this.#entries(project);
      const state = revertState(entries);
      const target = pick(entries, entryId, (entry) => isUndoable(entry, state), "undo");
      const targets = andLater ? restoreTargets(entries, target.seq - 1) : [target];
      const later = targets.length - 1;
      const title = revertTitle(target, entries);

      return this.#revert(
        entries,
        targets,
        "undo",
        later > 0 ? `${title} and ${later} later ${later === 1 ? "change" : "changes"}` : title,
        request,
      );
    });
  }

  /** Reapplies the given undo or restore, or the newest one that is still in effect. */
  redo(entryId: string | undefined, request: RevertRequest, project?: ProjectRef): Promise<RevertReport> {
    return this.#journal.exclusive(async () => {
      const entries = await this.#entries(project);
      const state = revertState(entries);
      const target = pick(entries, entryId, (entry) => isRedoable(entry, state), "redo");

      return this.#revert(entries, [target], "redo", revertTitle(target, entries), request);
    });
  }

  /**
   * Brings the project back to how it was at the checkpoint, in one revert: later changes are undone, and undos of
   * older changes made since are redone (see restoreTargets).
   */
  restore(checkpointId: string, request: RevertRequest, project?: ProjectRef): Promise<RevertReport> {
    return this.#journal.exclusive(async () => {
      const entries = await this.#entries(project);
      const checkpoint = entries.find((entry) => entry.id === checkpointId && entry.kind === "checkpoint");

      if (checkpoint === undefined) {
        throw new OperationError(
          "NOT_FOUND",
          `No checkpoint with id ${checkpointId}.`,
          "List checkpoints with activity_list.",
        );
      }

      const targets = restoreTargets(entries, checkpoint.seq);

      if (targets.length === 0) {
        throw new OperationError(
          "NOT_FOUND",
          `Nothing to restore: as far as the journal knows, the project is as it was at "${checkpoint.label}".`,
        );
      }

      return this.#revert(entries, targets, "restore", `Restore to "${checkpoint.label}"`, request);
    });
  }

  /**
   * The journal to revert in. A plugin window may show another project than the one this session works on (two
   * sitewright servers, one plugin): reverting there would run on the wrong project, so that is refused.
   */
  async #entries(shown?: ProjectRef): Promise<readonly ActivityEntry[]> {
    const project = await this.#journal.currentProject();

    if (project === null) {
      throw new OperationError(
        "NOT_CONFIGURED",
        "No Framer project is connected, so there is no activity journal.",
        "Check framer_status.",
      );
    }

    if (shown !== undefined && shown.id !== project.id) {
      throw new OperationError(
        "UNSUPPORTED_TRANSPORT",
        `This window shows "${shown.name}", but the sitewright session serving it works on "${project.name}", so it cannot revert there.`,
        `Ask Claude in the session for "${shown.name}" (activity_undo, activity_restore), or close the other session.`,
      );
    }

    return this.#journal.entries(project.id);
  }

  async #revert(
    entries: readonly ActivityEntry[],
    targets: readonly ActivityEntry[],
    kind: RevertKind,
    title: string,
    request: RevertRequest,
  ): Promise<RevertReport> {
    const { dryRun, onConflict } = request;
    const steps = applyAliases(
      targets.flatMap((target) => target.steps),
      aliasesOf(entries),
    );
    const history = dryRun ? undefined : new HistoryRecorder();
    const trace: CallTrace = { usedAgent: false };
    const started = this.#journal.now();
    const input = {
      steps,
      onConflict,
      dryRun,
    };
    // Asked once the revert ran: the route may depend on what the router learned on the way.
    const record = (conflicts: number, error: unknown) =>
      this.#record({
        kind,
        title,
        targets,
        history,
        started,
        conflicts,
        error,
        request,
        transport: this.#journal.transports.routeOf(historyRevert, input),
        trace,
      });
    const output = await this.#journal.transports
      .run(
        historyRevert,
        input,
        history === undefined
          ? { trace }
          : {
              history,
              trace,
            },
      )
      .catch(async (error: unknown) => {
        await record(0, error);

        throw error;
      });
    const entry = await record(output.conflicts, null);

    return {
      dryRun,
      reverted: targets.map(refOf),
      entry: entry === null ? null : refOf(entry),
      results: output.results,
      conflicts: output.conflicts,
    };
  }

  async #record(revert: RevertRecord): Promise<ActivityEntry | null> {
    const { history, request, error } = revert;

    if (history === undefined) {
      return null;
    }

    const steps = [...history.steps];
    let outcome: ActivityEntry["outcome"] = "ok";

    if (error !== null) {
      outcome = steps.length > 0 ? "partial" : "failed";
    }

    // "failed" keeps the targets undoable: undoing them again finds, item by item, what is already undone.
    if (error !== null && outcomeUnknown(error)) {
      history.markIncomplete(UNKNOWN_OUTCOME_NOTE);
    }

    return this.#journal.record({
      kind: revert.kind,
      actor: request.actor,
      tool: request.actor === "ai" ? `activity_${revert.kind}` : null,
      operation: historyRevert.name,
      effect: historyRevert.effect,
      transport: revert.transport,
      layer: layerOf(revert.transport, revert.trace),
      title: revert.title,
      outcome,
      error: error === null ? null : errorMessage(error),
      steps,
      incomplete: history.incomplete,
      reverts: revert.targets.map((target) => target.id),
      conflicts: revert.conflicts,
      // Kept even when the revert failed halfway: later undos must follow the items it did recreate.
      remap: { ...history.remap },
      label: null,
      durationMs: this.#journal.now() - revert.started,
      detail: null,
    });
  }
}

function pick(
  entries: readonly ActivityEntry[],
  entryId: string | undefined,
  eligible: (entry: ActivityEntry) => boolean,
  verb: RevertKind,
): ActivityEntry {
  if (entryId === undefined) {
    const newest = entries.findLast(eligible);

    if (newest === undefined) {
      throw new OperationError("NOT_FOUND", `Nothing to ${verb}.`, "See activity_list for what the journal holds.");
    }

    return newest;
  }

  const entry = entries.find((candidate) => candidate.id === entryId);

  if (entry === undefined || !eligible(entry)) {
    throw new OperationError(
      "INVALID_INPUT",
      `Entry ${entryId} cannot be ${verb === "undo" ? "undone" : "redone"} now.`,
      "See activity_list: undoable and redoable tell which entries can be undone or redone.",
    );
  }

  return entry;
}
