import type * as z from "zod";
import { NODE_TYPE_LABELS, OPERATION_LABELS } from "../constants/history.ts";
import type { ActivityItemSchema } from "../schemas/history.ts";
import type { ActivityEntry, ActivitySummary, EntryRef, RevertState, UndoStep } from "../types/history.ts";
import { categoriesOf, itemCategories } from "./change-categories.ts";

/** A short human title, e.g. "Color tokens: 2 created, 1 updated". */
export function describeOperation(operation: string, steps: readonly UndoStep[]): string {
  const label = OPERATION_LABELS[operation] ?? operation;
  const changes = describeChanges(steps);

  return changes === "" ? label : `${label}: ${changes}`;
}

/** "2 created, 1 updated, 1 deleted", or an empty string when nothing changed. */
function describeChanges(steps: readonly UndoStep[]): string {
  const counts = {
    created: steps.filter((step) => step.before === null).length,
    updated: steps.filter((step) => step.before !== null && step.after !== null).length,
    deleted: steps.filter((step) => step.after === null).length,
  };

  return Object.entries(counts)
    .filter(([, count]) => count > 0)
    .map(([change, count]) => `${count} ${change}`)
    .join(", ");
}

/**
 * How the journal's reverts stand. Walking newest first, a revert counts only while no later live entry reverts it, so
 * undo → redo → undo chains resolve to what is in effect now. A revert that changed nothing because it failed, or
 * because every item had changed since, counts for nothing: its targets can still be undone, with force.
 */
export function revertState(entries: readonly ActivityEntry[]): RevertState {
  const undone = new Set<string>();
  const superseded = new Set<string>();

  for (const entry of [...entries].reverse()) {
    for (const id of revertsOf(entry)) {
      superseded.add(id);

      if (!undone.has(entry.id)) {
        undone.add(id);
      }
    }
  }

  return {
    undone,
    superseded,
  };
}

/**
 * The title of an entry that reverts `target`, named after the change at the start of the chain: undoing it once is
 * "Undo: …", bringing it back is "Redo: …", however long the chain of undos and redos behind `target` is.
 */
export function revertTitle(target: ActivityEntry, entries: readonly ActivityEntry[]): string {
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const seen = new Set<string>();
  let origin = target;
  let depth = 1;

  // A single undo or redo continues the chain; a restore or a tool call starts it. `seen` guards a corrupted journal.
  while ((origin.kind === "undo" || origin.kind === "redo") && origin.reverts.length === 1 && !seen.has(origin.id)) {
    const reverted = byId.get(origin.reverts[0] ?? "");

    if (reverted === undefined) {
      break;
    }

    seen.add(origin.id);
    origin = reverted;
    depth += 1;
  }

  return `${depth % 2 === 1 ? "Undo" : "Redo"}: ${origin.title}`;
}

/**
 * The entries to revert, oldest first, so the project ends up as it was right after entry number `afterSeq`: a
 * checkpoint's seq for a restore, or the seq before an entry to undo it together with everything after it.
 * Walking the entries after it newest first:
 * - a revert whose targets all came after the boundary cancels out with them: neither is reverted;
 * - a change still in effect is reverted, including an undo or redo of something older than the boundary;
 * - an undone change is reverted too once the revert that undid it is, since reverting that brings it back.
 */
export function restoreTargets(entries: readonly ActivityEntry[], afterSeq: number): ActivityEntry[] {
  const after = entries.filter((entry) => entry.seq > afterSeq && entry.steps.length > 0);
  const inWindow = new Set(after.map((entry) => entry.id));
  const { undone } = revertState(entries);
  const cancelled = new Set<string>();
  const targets: ActivityEntry[] = [];

  for (const entry of [...after].reverse()) {
    const reverted = revertsOf(entry);

    if (cancelled.has(entry.id)) {
      continue;
    }

    if (!undone.has(entry.id) && reverted.length > 0 && reverted.every((id) => inWindow.has(id))) {
      for (const id of reverted) {
        cancelled.add(id);
      }

      continue;
    }

    targets.unshift(entry);
  }

  return targets;
}

/** Old id → newest id, from every recreation the journal knows about. */
export function aliasesOf(entries: readonly ActivityEntry[]): Map<string, string> {
  return new Map(entries.flatMap((entry) => Object.entries(entry.remap)));
}

/**
 * A change that undo can revert now: a tool call or redo that recorded undo steps and that nothing reverts. Once an
 * entry is reverted, the newest link of its chain carries the undo and redo, so each change has one button.
 */
export function isUndoable(entry: ActivityEntry, state: RevertState): boolean {
  return (
    (entry.kind === "operation" || entry.kind === "redo") && entry.steps.length > 0 && !state.superseded.has(entry.id)
  );
}

/** An undo or restore that redo can reapply now: it changed something and nothing reverts it. */
export function isRedoable(entry: ActivityEntry, state: RevertState): boolean {
  return (
    (entry.kind === "undo" || entry.kind === "restore") && entry.steps.length > 0 && !state.superseded.has(entry.id)
  );
}

export function summarizeEntry(entry: ActivityEntry, state: RevertState): ActivitySummary {
  return {
    id: entry.id,
    seq: entry.seq,
    at: entry.at,
    kind: entry.kind,
    actor: entry.actor,
    effect: entry.effect,
    title: entry.title,
    outcome: entry.outcome,
    error: entry.error,
    tool: entry.tool,
    // Entries from before the field: only a plugin call is known for sure.
    layer: entry.layer ?? (entry.transport === "plugin" ? "plugin-api" : null),
    changes: describeChanges(entry.steps),
    categories: categoriesOf(entry.steps),
    items: itemsOf(entry.steps),
    undoable: isUndoable(entry, state),
    undone: state.undone.has(entry.id),
    redoable: isRedoable(entry, state),
    conflicts: entry.conflicts,
    incomplete: entry.incomplete,
    label: entry.label,
    detail: entry.detail,
  };
}

/** A journal entry as other entries and tool results refer to it. */
export function refOf(entry: ActivityEntry): EntryRef {
  return {
    id: entry.id,
    seq: entry.seq,
    title: entry.title,
  };
}

/** The entries a revert reverts: none when it changed nothing, having failed or found every item changed since. */
function revertsOf(entry: ActivityEntry): readonly string[] {
  const changedNothing = entry.steps.length === 0 && (entry.outcome === "failed" || entry.conflicts > 0);

  return changedNothing ? [] : entry.reverts;
}

/** One item per thing the steps changed: a node set and moved in one batch is one chip, not two. */
function itemsOf(steps: readonly UndoStep[]): z.infer<typeof ActivityItemSchema>[] {
  const byItem = new Map<string, UndoStep[]>();

  for (const step of steps) {
    const key = `${step.kind}:${step.id}`;

    byItem.set(key, [...(byItem.get(key) ?? []), step]);
  }

  return [...byItem.values()].flatMap((group) => {
    const first = group[0];
    const last = group.at(-1);

    return first === undefined || last === undefined ? [] : [itemOf(first, last, group)];
  });
}

function itemOf(first: UndoStep, last: UndoStep, steps: readonly UndoStep[]): z.infer<typeof ActivityItemSchema> {
  let change: "created" | "updated" | "deleted" = "updated";

  if (first.before === null) {
    change = "created";
  } else if (last.after === null) {
    change = "deleted";
  }

  return {
    kind: last.kind,
    id: last.id,
    path: labelOf(last),
    change,
    swatch: last.kind === "color-style" ? ((last.after ?? last.before)?.light ?? null) : null,
    categories: itemCategories(steps),
  };
}

/**
 * How lists name an item: a style by its path, a node by its name. A node without one is named after its type, and
 * an instance after the first text among its controls too ("Instance: Get started").
 */
export function labelOf(step: UndoStep): string {
  if (step.kind !== "node") {
    return step.after?.path ?? step.before?.path ?? "";
  }

  if (step.name !== null) {
    return step.name;
  }

  const type = NODE_TYPE_LABELS[step.type] ?? step.type;
  const attributes = step.after?.attributes ?? step.before?.attributes ?? {};
  const control = Object.entries(attributes).find(
    ([key, value]) => key.startsWith("$control__") && key !== "$control__variant" && typeof value === "string",
  )?.[1];

  return typeof control === "string" && control !== "" ? `${type}: ${control}` : type;
}
