import { SNAPSHOT_DEPTH, TEXT_CONTENT_DEPTH, UNREADABLE_ATTRIBUTES } from "../../constants/history.ts";
import type { DslCommand } from "../../types/dsl.ts";
import type { DslSnapshots } from "../../types/history.ts";
import { isTruncated } from "./serialized.ts";

/**
 * Why the steps may miss what a batch did: changes that happened but left no step, or left only part of one. Each
 * reason names the nodes, so the journal says exactly what undo cannot bring back. `failed`: the DSL call threw, so
 * Framer never reported the ids of the nodes it may have created.
 */
export function missedChanges(snapshots: DslSnapshots, failed: boolean): string[] {
  const { targets, renamedIds, before, after } = snapshots;
  const deleted = new Set(targets.flatMap((target) => (target.change === "deleted" ? [target.id] : [])));
  const inDeletedSubtrees = new Set(
    [...before.deleted.values()].flatMap((snapshot) => snapshot.nodes.map(({ id }) => id)),
  );
  // A node inside a deleted one can still be read, under its old parent: "gone" also means "under a deleted node".
  const lost = (id: string) => {
    const parentId = after.nodes.get(id)?.$parentId;

    return parentId === undefined || deleted.has(parentId) || inDeletedSubtrees.has(parentId);
  };
  const reasons: string[] = [];
  const note = (ids: readonly string[], reason: (list: string) => string) => {
    if (ids.length > 0) {
      reasons.push(reason(ids.join(", ")));
    }
  };

  if (failed && targets.some((target) => target.change === "created")) {
    reasons.push("The DSL call failed, so nodes it may have created are not in the undo steps.");
  }

  note(
    targets.flatMap((target) => {
      const id = target.change === "created" ? renamedIds[target.id] : undefined;

      return id === undefined || after.nodes.has(id) ? [] : [id];
    }),
    (list) => `New nodes ${list} could not be read after the change, so undo cannot remove them.`,
  );
  note(
    targets.flatMap((target) =>
      target.change !== "created" &&
      !before.nodes.has(target.id) &&
      !before.deleted.has(target.id) &&
      !before.unplaced.includes(target.id)
        ? [target.id]
        : [],
    ),
    (list) =>
      `Nodes ${list} could not be read before the change (not on this page: components, styles, the site's root), so undo cannot restore them.`,
  );
  note(
    before.unplaced.filter((id) => !after.nodes.has(id)),
    (list) => `Deleted nodes ${list} could not be placed before the change, so undo cannot bring them back.`,
  );
  note(
    targets.flatMap((target) =>
      target.change === "moved" && lost(target.id) && !deleted.has(target.id) && !inDeletedSubtrees.has(target.id)
        ? [target.id]
        : [],
    ),
    (list) => `Nodes ${list} were moved into a node the same batch deleted, so undo cannot bring them back.`,
  );
  note(
    targets.flatMap((target) => {
      const read = [before.nodes.get(target.id), after.nodes.get(target.id)];

      return target.change === "updated" && target.text && read.some((node) => node !== undefined && isTruncated(node))
        ? [target.id]
        : [];
    }),
    (list) =>
      `Rich text ${list} is nested deeper than ${TEXT_CONTENT_DEPTH} levels, so undo may not restore all of it.`,
  );

  if ([...before.deleted.values()].some((snapshot) => snapshot.truncated)) {
    reasons.push(`A deleted subtree is deeper than ${SNAPSHOT_DEPTH} levels; undo restores the top of it.`);
  }

  return reasons;
}

/** Changes to attributes Framer never reports back: they happen, but no step records them. */
export function unreadableChanges(commands: readonly DslCommand[]): string[] {
  const keys = [
    ...new Set(
      commands.flatMap((command) => Object.keys(command.attributes).filter((key) => UNREADABLE_ATTRIBUTES.has(key))),
    ),
  ];

  return keys.length === 0 ? [] : [`Framer does not report ${keys.join(", ")} back, so undo cannot restore it.`];
}
