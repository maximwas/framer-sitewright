import { SERIALIZED_STRUCTURE_KEYS, UNSET_LOOKALIKES } from "../../constants/history.ts";
import { SerializedNodeSchema } from "../../schemas/dsl.ts";
import type { SerializedNode } from "../../types/dsl.ts";
import type { DslAttributeMap, NodeSnapshot } from "../../types/history.ts";

/** One serialized node, or null for anything else (serialize() answers null for an unknown id). */
export function parseSerializedNode(value: unknown): SerializedNode | null {
  const parsed = SerializedNodeSchema.safeParse(value);

  return parsed.success ? parsed.data : null;
}

/** serializeNodes() output as nodes by id; ids Framer could not resolve are simply missing. */
export function serializedById(value: unknown): Map<string, SerializedNode> {
  const nodes = Array.isArray(value) ? value : [];

  return new Map(
    nodes.flatMap((item) => {
      const node = parseSerializedNode(item);

      return node === null ? [] : [[node.id, node] as const];
    }),
  );
}

/** The nodes of a getNodesOfTypes-like answer, a list or an object of nodes; what does not parse is left out. */
export function serializedList(value: unknown): SerializedNode[] {
  const items: unknown[] = Array.isArray(value) ? value : Object.values(value ?? {});

  return items.flatMap((item) => {
    const node = parseSerializedNode(item);

    return node === null ? [] : [node];
  });
}

export function childrenOf(node: SerializedNode): SerializedNode[] {
  return (node.children ?? []).flatMap((child) => {
    const parsed = parseSerializedNode(child);

    return parsed === null ? [] : [parsed];
  });
}

/**
 * A node's attributes as DSL values. Effects and shadows come as objects and lists; they become dotted keys, the way
 * the DSL sets them (`appearEffect.enter.opacity`, `boxShadows.0`), so the journal sees and restores them. Keys without
 * a value are left out: the DSL would reject them. A value that also means "unset" is null (UNSET_LOOKALIKES).
 */
export function attributesOf(node: SerializedNode): DslAttributeMap {
  const lookalikes = UNSET_LOOKALIKES[node.type] ?? {};
  const flat: Record<string, string | number | boolean | null> = {};

  for (const [key, value] of Object.entries(node.attributes ?? {})) {
    flattenInto(flat, key, value);
  }

  return Object.fromEntries(
    Object.entries(flat).map(([key, value]) => [key, lookalikes[key] === value ? null : value]),
  );
}

/**
 * Everything a SET can change on a node: its attributes, its top-level parameters (an instance's `component`, a
 * token's `light`) and its name. A missing name is "": that is how the DSL clears one (`name="null"` names it "null").
 */
export function fieldsOf(node: SerializedNode): DslAttributeMap {
  return {
    name: node.name ?? "",
    ...paramsOf(node),
    ...attributesOf(node),
  };
}

/** What `+Type` needs besides the attributes: top-level fields such as an instance's `component`. */
export function paramsOf(node: SerializedNode): DslAttributeMap {
  const top = Object.fromEntries(
    Object.entries(node).filter(([key]) => !key.startsWith("$") && !SERIALIZED_STRUCTURE_KEYS.has(key)),
  );

  return primitivesOf(top);
}

/** A subtree as a list in pre-order, each node naming its parent and index there; `parentId` and `index` place the root. */
function flattenSubtree(root: SerializedNode, parentId: string, index: number): NodeSnapshot[] {
  return [
    snapshotOf(root, parentId, index),
    ...childrenOf(root).flatMap((child, position) => flattenSubtree(child, root.id, position)),
  ];
}

/** One node, placed under `parentId` at `index`, as a plain (not replica) node. */
export function snapshotOf(node: SerializedNode, parentId: string, index: number): NodeSnapshot {
  return {
    id: node.id,
    type: node.type,
    name: node.name ?? null,
    parentId,
    index,
    params: paramsOf(node),
    attributes: attributesOf(node),
    replicaOf: null,
    gesture: node.$gesture ?? null,
  };
}

/** A rich text's content: its blocks, lists and runs in pre-order under the text node. */
export function contentOf(node: SerializedNode): NodeSnapshot[] {
  return childrenOf(node).flatMap((child, position) => flattenSubtree(child, node.id, position));
}

/** Whether serialize() cut the subtree short (depth limit): then a snapshot of it is incomplete. */
export function isTruncated(node: SerializedNode): boolean {
  return node.$truncated || childrenOf(node).some(isTruncated);
}

/** The attributes of `node` that differ from `reference`, e.g. a replica's overrides of its primary. */
export function differingAttributes(node: DslAttributeMap, reference: DslAttributeMap): DslAttributeMap {
  return Object.fromEntries(Object.entries(node).filter(([key, value]) => !sameValue(value, reference[key])));
}

export function sameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function flattenInto(into: Record<string, string | number | boolean | null>, key: string, value: unknown): void {
  if (value === null || ["string", "number", "boolean"].includes(typeof value)) {
    into[key] = value as string | number | boolean | null;
  } else if (Array.isArray(value)) {
    value.forEach((item, index) => {
      flattenInto(into, `${key}.${index}`, item);
    });
  } else if (typeof value === "object") {
    for (const [inner, item] of Object.entries(value)) {
      flattenInto(into, `${key}.${inner}`, item);
    }
  }
}

/** Top-level creation parameters: only plain values, an object there is not something `+Type` takes. */
function primitivesOf(record: Readonly<Record<string, unknown>>): DslAttributeMap {
  return Object.fromEntries(
    Object.entries(record).filter(
      (entry): entry is [string, string | number | boolean | null] =>
        entry[1] === null || ["string", "number", "boolean"].includes(typeof entry[1]),
    ),
  );
}
