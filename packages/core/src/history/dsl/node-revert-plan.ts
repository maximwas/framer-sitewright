import { deleteNode, formatDslAttributes } from "../../dsl/commands.ts";
import type { SerializedNode } from "../../types/dsl.ts";
import type {
  CurrentNodes,
  DslAttributeMap,
  NodeDecision,
  NodePlacement,
  NodeRevertOptions,
  NodeRevertPlan,
  NodeSnapshot,
  NodeStep,
  PendingOverride,
  WorkingNode,
} from "../../types/history.ts";
import { valueIn, withAttributes } from "./attribute-groups.ts";
import { childrenOf, contentOf, fieldsOf, sameValue } from "./serialized.ts";

/**
 * Plans undoing node steps on one page as one DSL batch. Steps come newest first, and each is decided against the
 * nodes as the newer steps leave them: a node recreated by one step is found, under its temp id, by the next.
 * `current` holds every node the steps name, and their parents, as Framer has them now, and where moved nodes sit.
 */
export function planNodeRevert(
  steps: readonly NodeStep[],
  current: CurrentNodes,
  options: NodeRevertOptions,
): NodeRevertPlan {
  return new NodeRevertPlanner(current, options).plan(steps);
}

class NodeRevertPlanner {
  readonly #nodes = new Map<string, WorkingNode>();
  readonly #alias = new Map<string, string>();
  readonly #options: NodeRevertOptions;
  readonly #commands: string[] = [];
  readonly #pending: PendingOverride[] = [];
  readonly #removePages: string[] = [];
  readonly #recreated = new Map<string, string>();

  constructor(current: CurrentNodes, options: NodeRevertOptions) {
    this.#options = options;

    for (const node of current.nodes.values()) {
      this.#nodes.set(node.id, workingNode(node, current.placements.get(node.id)));
    }
  }

  plan(steps: readonly NodeStep[]): NodeRevertPlan {
    const decisions = steps.map((step) => this.#decide(step));

    return {
      commands: this.#commands,
      decisions,
      recreated: this.#recreated,
      pendingOverrides: this.#pending,
      removePages: this.#removePages,
    };
  }

  #decide(step: NodeStep): NodeDecision {
    switch (step.change) {
      case "created":
        return this.#undoCreate(step);
      case "updated":
        return this.#undoUpdate(step);
      case "moved":
        return this.#undoMove(step);
      case "deleted":
        return this.#undoDelete(step);
    }
  }

  #undoCreate(step: NodeStep): NodeDecision {
    const id = this.#resolve(step.id);
    const node = this.#nodes.get(id);

    if (node === undefined) {
      return decision(step, "gone");
    }

    if (!this.#options.force && !matches(node.attributes, step.after?.attributes ?? {})) {
      return decision(step, "conflict");
    }

    if (step.type === "WebPageNode") {
      this.#removePages.push(id); // the DSL cannot delete a page
    } else {
      this.#commands.push(deleteNode(id));
    }

    this.#nodes.delete(id);

    return decision(step, "deleted", [], [id]);
  }

  #undoUpdate(step: NodeStep): NodeDecision {
    const id = this.#resolve(step.id);
    const node = this.#nodes.get(id);
    const before = step.before;
    const after = step.after;

    if (node === undefined || before === null || after === null) {
      return decision(step, "gone");
    }

    const textChanged = before.nodes.length > 0 || after.nodes.length > 0;

    if (matches(node.attributes, before.attributes) && (!textChanged || sameContent(node.content, before.nodes))) {
      return decision(step, "unchanged");
    }

    const untouched =
      matches(node.attributes, after.attributes) && (!textChanged || sameContent(node.content, after.nodes));

    if (!untouched && !this.#options.force) {
      return decision(step, "conflict");
    }

    const notes = this.#set(id, before.attributes);

    if (textChanged) {
      notes.push(...this.#restoreContent(node, id, before.nodes));
    }

    node.attributes = withAttributes(node.attributes, before.attributes);

    return decision(step, "restored", notes, [id, ...node.contentIds]);
  }

  #undoMove(step: NodeStep): NodeDecision {
    const id = this.#resolve(step.id);
    const node = this.#nodes.get(id);
    const was = step.before;

    if (node === undefined || was === null || was.parentId === null) {
      return decision(step, "gone");
    }

    const oldParent = this.#resolve(was.parentId);

    if (isAt(node, oldParent, was.index)) {
      return decision(step, "unchanged");
    }

    const now = step.after;
    const untouched = now === null || now.parentId === null || isAt(node, this.#resolve(now.parentId), now.index);

    if (!this.#nodes.has(oldParent)) {
      return decision(step, "conflict", ["Its old parent no longer exists."]);
    }

    if (!untouched && !this.#options.force) {
      return decision(step, "conflict");
    }

    const index = was.index === null ? "" : ` index="${was.index}"`;

    this.#commands.push(`MOVE ${id} parent="${oldParent}"${index};`);
    node.parentId = oldParent;
    node.index = was.index;

    return decision(step, "restored", [], [id]);
  }

  #undoDelete(step: NodeStep): NodeDecision {
    const before = step.before;

    if (this.#nodes.has(this.#resolve(step.id))) {
      return decision(step, "unchanged");
    }

    if (before === null || before.parentId === null || before.nodes.length === 0) {
      return decision(step, "gone");
    }

    const parent = this.#resolve(before.parentId);

    if (!this.#nodes.has(parent) && before.nodes[0]?.replicaOf === null) {
      return decision(step, "conflict", ["Its parent no longer exists."]);
    }

    const notes = this.#recreate(before.nodes, before.overrides);

    return decision(
      step,
      "recreated",
      notes,
      before.nodes.map((node) => this.#resolve(node.id)),
    );
  }

  /** `+Type` or CREATE_VARIANT for each node of a snapshot, then the overrides replica variants held for them. */
  #recreate(
    nodes: readonly NodeSnapshot[],
    overrides: Readonly<Record<string, Readonly<Record<string, DslAttributeMap>>>>,
  ): string[] {
    const notes: string[] = [];

    for (const node of nodes) {
      const tempId = this.#options.nextTempId();
      const parent = this.#resolve(node.parentId);

      this.#alias.set(node.id, tempId);
      this.#recreated.set(node.id, tempId);
      notes.push(...this.#create(node, tempId, parent));
      this.#nodes.set(tempId, {
        parentId: parent,
        index: node.index,
        attributes: { ...node.attributes },
        content: [],
        contentIds: [],
      });
    }

    for (const [replicaId, byNode] of Object.entries(overrides)) {
      for (const [nodeId, attributes] of Object.entries(byNode)) {
        notes.push(...this.#override(replicaId, nodeId, attributes));
      }
    }

    return notes;
  }

  #create(node: NodeSnapshot, tempId: string, parent: string): string[] {
    const name = node.name === null ? {} : { name: node.name };

    if (node.replicaOf !== null) {
      const gesture = node.gesture === null ? "" : ` gesture="${node.gesture}"`;

      this.#commands.push(`CREATE_VARIANT ${tempId} from="${this.#resolve(node.replicaOf)}"${gesture};`);

      return this.#set(tempId, {
        ...name,
        ...node.attributes,
      });
    }

    const params = Object.fromEntries(Object.entries(node.params).filter(([key]) => !(key in node.attributes)));
    const { text, skipped } = formatDslAttributes({
      parent,
      index: node.index,
      ...name,
      ...params,
      ...node.attributes,
    });

    this.#commands.push(`+${node.type} ${tempId}${text === "" ? "" : ` ${text}`};`);

    return skippedNote(skipped);
  }

  /** A replica's override for a recreated node: in this batch when the replica is new too, else once ids are real. */
  #override(replicaId: string, nodeId: string, attributes: DslAttributeMap): string[] {
    const replica = this.#resolve(replicaId);
    const node = this.#resolve(nodeId);

    if (this.#recreated.has(replicaId) || !this.#recreated.has(nodeId)) {
      return this.#set(`${replica}${node}`, attributes);
    }

    this.#pending.push({
      replicaId: replica,
      tempId: node,
      attributes,
    });

    return [];
  }

  /**
   * Deletes a rich text's current blocks and recreates the ones it had; the new blocks replace the old ones. Block ids
   * are positions, so the last block goes first: deleting one never renumbers the blocks still to delete.
   */
  #restoreContent(node: WorkingNode, id: string, content: readonly NodeSnapshot[]): string[] {
    for (const child of [...node.contentIds].reverse()) {
      this.#commands.push(deleteNode(child));
    }

    const notes = this.#recreate(content, {});

    node.content = [...content];
    node.contentIds = content
      .filter((block) => this.#resolve(block.parentId) === id)
      .map((block) => this.#resolve(block.id));

    return notes;
  }

  #set(id: string, attributes: DslAttributeMap): string[] {
    const { text, skipped } = formatDslAttributes(attributes);

    if (text !== "") {
      this.#commands.push(`SET ${id} ${text};`);
    }

    return skippedNote(skipped);
  }

  #resolve(id: string): string {
    return this.#alias.get(id) ?? id;
  }
}

function workingNode(node: SerializedNode, placement: NodePlacement | undefined): WorkingNode {
  return {
    parentId: node.$parentId ?? null,
    index: placement?.index ?? null,
    attributes: fieldsOf(node),
    content: contentOf(node),
    contentIds: childrenOf(node).map((child) => child.id),
  };
}

/** Whether the node sits under `parent`, at `index` too when both indexes are known. */
function isAt(node: WorkingNode, parent: string, index: number | null): boolean {
  return node.parentId === parent && (index === null || node.index === null || node.index === index);
}

function decision(
  step: NodeStep,
  outcome: NodeDecision["outcome"],
  notes: readonly string[] = [],
  targets: readonly string[] = [],
): NodeDecision {
  return {
    step,
    outcome,
    note: notes.length === 0 ? null : notes.join(" "),
    targets,
  };
}

/** Whether `current` has every expected value; keys `expected` does not name may differ. */
function matches(current: DslAttributeMap, expected: DslAttributeMap): boolean {
  return Object.entries(expected).every(([key, value]) => sameValue(valueIn(current, key), value));
}

/** Rich text content compared by shape: types, names, attributes and positions, not the (positional) ids. */
function sameContent(left: readonly NodeSnapshot[], right: readonly NodeSnapshot[]): boolean {
  return sameValue(shapeOf(left), shapeOf(right));
}

function shapeOf(nodes: readonly NodeSnapshot[]) {
  const pathOf = new Map<string, string>();

  return nodes.map((node) => {
    const path = `${pathOf.get(node.parentId) ?? ""}/${node.index}`;

    pathOf.set(node.id, path);

    return [path, node.type, node.name, node.attributes];
  });
}

function skippedNote(skipped: readonly string[]): string[] {
  return skipped.length === 0 ? [] : [`The DSL cannot carry ${skipped.join(", ")}, so they were not restored.`];
}
