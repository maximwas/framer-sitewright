import { childrenOf } from "../history/dsl/serialized.ts";
import type { SerializedNode } from "../types/dsl.ts";
import type { DslAttributeMap, NodeSnapshot } from "../types/history.ts";

/** A read node's attributes as an undo step keeps them: plain values only. */
export function dslAttributes(attributes: Readonly<Record<string, unknown>> | undefined): DslAttributeMap {
  return Object.fromEntries(
    Object.entries(attributes ?? {}).flatMap(([name, value]) =>
      typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value === null
        ? [[name, value] as const]
        : [],
    ),
  );
}

/** A subtree in pre-order, each node naming its parent and its place there, as the DSL's undo keeps a deletion. */
export function snapshotsOf(tree: SerializedNode, parentId: string, index: number): NodeSnapshot[] {
  const own: NodeSnapshot = {
    id: tree.id,
    type: tree.type,
    name: tree.name ?? null,
    parentId,
    index,
    params: {},
    attributes: dslAttributes(tree.attributes),
    replicaOf: null,
    gesture: null,
  };

  return [own, ...childrenOf(tree).flatMap((child, position) => snapshotsOf(child, tree.id, position))];
}
