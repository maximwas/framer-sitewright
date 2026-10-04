import type { SerializedNode } from "../../types/dsl.ts";
import type { CaptureTarget, DslAttributeMap, DslSnapshots, NodeState, NodeStep } from "../../types/history.ts";
import { collapseAbsentGroups } from "./attribute-groups.ts";
import { contentOf, fieldsOf, sameValue } from "./serialized.ts";

/**
 * Undo steps from what really changed, in command order: the state decides, so a command Framer refused leaves no
 * step, and anything Framer changed on its own beside the command is part of the step.
 */
export function nodeSteps(snapshots: DslSnapshots): NodeStep[] {
  return snapshots.targets.flatMap((target) => {
    const step = stepFor(target, snapshots);

    return step === null ? [] : [step];
  });
}

function stepFor(target: CaptureTarget, snapshots: DslSnapshots): NodeStep | null {
  switch (target.change) {
    case "created":
      return createdStep(target.id, snapshots);
    case "updated":
      return updatedStep(target.id, target.text, snapshots);
    case "moved":
      return movedStep(target.id, snapshots);
    case "deleted":
      return deletedStep(target.id, snapshots);
  }
}

function createdStep(tempId: string, { pagePath, renamedIds, after }: DslSnapshots): NodeStep | null {
  const id = renamedIds[tempId] ?? tempId;
  const node = after.nodes.get(id);

  if (node === undefined) {
    return null;
  }

  return {
    ...identity(node, pagePath),
    change: "created",
    before: null,
    after: state({ attributes: fieldsOf(node) }),
  };
}

function updatedStep(id: string, text: boolean, { pagePath, before, after }: DslSnapshots): NodeStep | null {
  const was = before.nodes.get(id);
  const now = after.nodes.get(id);

  if (was === undefined || now === undefined) {
    return null;
  }

  const [wasAttributes, nowAttributes] = changedAttributes(fieldsOf(was), fieldsOf(now));
  const wasContent = text ? contentOf(was) : [];
  const nowContent = text ? contentOf(now) : [];
  const contentChanged = !sameValue(wasContent, nowContent);

  if (Object.keys(wasAttributes).length === 0 && !contentChanged) {
    return null;
  }

  return {
    ...identity(now, pagePath),
    change: "updated",
    before: state({
      attributes: wasAttributes,
      nodes: contentChanged ? wasContent : [],
    }),
    after: state({
      attributes: nowAttributes,
      nodes: contentChanged ? nowContent : [],
    }),
  };
}

function movedStep(id: string, { pagePath, before, after }: DslSnapshots): NodeStep | null {
  const node = after.nodes.get(id);
  const was = before.placements.get(id);
  const now = after.placements.get(id);

  if (node === undefined || was === undefined || now === undefined || sameValue(was, now)) {
    return null;
  }

  return {
    ...identity(node, pagePath),
    change: "moved",
    before: state(was),
    after: state(now),
  };
}

function deletedStep(id: string, { pagePath, before, after }: DslSnapshots): NodeStep | null {
  const snapshot = before.deleted.get(id);
  const root = snapshot?.nodes[0];

  if (snapshot === undefined || root === undefined || after.nodes.has(id)) {
    return null;
  }

  return {
    kind: "node",
    id,
    type: root.type,
    name: root.name,
    pagePath,
    change: "deleted",
    before: state({
      parentId: root.parentId,
      index: root.index,
      attributes: root.attributes,
      nodes: [...snapshot.nodes],
      overrides: snapshot.overrides,
    }),
    after: null,
  };
}

/**
 * Only the keys whose values differ; a key one side lacks counts as null, which is how the DSL clears it. An effect
 * one side lacks entirely is null as a whole there (attribute-groups.ts).
 */
function changedAttributes(was: DslAttributeMap, now: DslAttributeMap): [DslAttributeMap, DslAttributeMap] {
  const keys = [...new Set([...Object.keys(was), ...Object.keys(now)])].filter(
    (key) => !sameValue(was[key] ?? null, now[key] ?? null),
  );
  const wasChanged = Object.fromEntries(keys.map((key) => [key, was[key] ?? null]));
  const nowChanged = Object.fromEntries(keys.map((key) => [key, now[key] ?? null]));

  return [collapseAbsentGroups(wasChanged, was, now), collapseAbsentGroups(nowChanged, now, was)];
}

function identity(node: SerializedNode, pagePath: string) {
  return {
    kind: "node" as const,
    id: node.id,
    type: node.type,
    name: node.name ?? null,
    pagePath,
  };
}

function state(parts: Partial<NodeState>): NodeState {
  return {
    parentId: null,
    index: null,
    attributes: {},
    nodes: [],
    overrides: {},
    ...parts,
  };
}
