import { SNAPSHOT_DEPTH } from "../../constants/history.ts";
import type { SerializedNode } from "../../types/dsl.ts";
import type { AgentPort } from "../../types/framer.ts";
import type { DeletedSnapshot, DslAttributeMap, NodePlacement, NodeSnapshot } from "../../types/history.ts";
import { readNodes } from "./read-nodes.ts";
import { attributesOf, childrenOf, differingAttributes, isTruncated, snapshotOf } from "./serialized.ts";

/**
 * Everything needed to bring a node back after DEL: its subtree, where it sat, and the overrides replica variants
 * (other breakpoints, component variants) held for it. Replica variants are kept as "replicates X" plus their
 * differences from X, since Framer recreates their descendants itself (CREATE_VARIANT).
 */
export async function snapshotDeleted(
  agent: AgentPort,
  pagePath: string,
  root: SerializedNode,
  placement: NodePlacement,
): Promise<DeletedSnapshot> {
  const primary = await primaryAttributes(agent, pagePath, root);
  const overrides: Record<string, Record<string, DslAttributeMap>> = {};
  const nodes = flatten(root, placement.parentId, placement.index, primary, overrides);

  Object.assign(overrides, await replicaOverrides(agent, pagePath, root, nodes));

  return {
    nodes,
    overrides,
    truncated: isTruncated(root),
  };
}

/**
 * A deleted subtree without the nodes that outlived the batch: moved out before their parent was deleted (an
 * "unwrap"). Undo recreates the parent without them, and their own moved steps bring them back into it.
 */
export function withoutSurvivors(snapshot: DeletedSnapshot, survivors: ReadonlySet<string>): DeletedSnapshot {
  const [root, ...descendants] = snapshot.nodes;
  const dropped = new Set<string>();

  if (root === undefined || survivors.size === 0) {
    return snapshot;
  }

  // Pre-order: a parent is decided before its children.
  for (const node of descendants) {
    if (survivors.has(node.id) || dropped.has(node.parentId)) {
      dropped.add(node.id);
    }
  }

  return {
    ...snapshot,
    nodes: snapshot.nodes.filter((node) => !dropped.has(node.id)),
    overrides: Object.fromEntries(
      Object.entries(snapshot.overrides)
        .filter(([replicaId]) => !dropped.has(replicaId))
        .map(([replicaId, byNode]) => [
          replicaId,
          Object.fromEntries(Object.entries(byNode).filter(([nodeId]) => !dropped.has(nodeId))),
        ]),
    ),
  };
}

/** Ids of the nodes below a deleted subtree's root. */
export function descendantIds(snapshot: DeletedSnapshot): string[] {
  return snapshot.nodes.slice(1).map((node) => node.id);
}

/** Attributes of the primary nodes the subtree's replicas replicate, by id; the subtree's own nodes count too. */
async function primaryAttributes(
  agent: AgentPort,
  pagePath: string,
  root: SerializedNode,
): Promise<Map<string, DslAttributeMap>> {
  const own = collect(root);
  const source = root.$isReplica ? (root.$inheritsFrom ?? root.$originalId) : undefined;

  if (source === undefined) {
    return own;
  }

  const read = await readNodes(agent, pagePath, [source], SNAPSHOT_DEPTH);
  const original = read.get(source);

  return original === undefined ? own : new Map([...collect(original), ...own]);
}

function collect(node: SerializedNode): Map<string, DslAttributeMap> {
  return new Map([[node.id, attributesOf(node)], ...childrenOf(node).flatMap((child) => [...collect(child)])]);
}

/** The subtree in pre-order; a replica variant becomes one node plus overrides for its descendants. */
function flatten(
  node: SerializedNode,
  parentId: string,
  index: number,
  primary: ReadonlyMap<string, DslAttributeMap>,
  overrides: Record<string, Record<string, DslAttributeMap>>,
): NodeSnapshot[] {
  const source = node.$isReplica ? (node.$inheritsFrom ?? node.$originalId ?? null) : null;
  const snapshot = snapshotOf(node, parentId, index);

  if (source !== null) {
    overrides[node.id] = descendantOverrides(node, primary);

    return [
      {
        ...snapshot,
        attributes: differingAttributes(snapshot.attributes, primary.get(source) ?? {}),
        replicaOf: source,
      },
    ];
  }

  return [
    snapshot,
    ...childrenOf(node).flatMap((child, position) => flatten(child, node.id, position, primary, overrides)),
  ];
}

/** A replica variant's descendants that differ from the primary nodes they replicate, by original id. */
function descendantOverrides(
  replica: SerializedNode,
  primary: ReadonlyMap<string, DslAttributeMap>,
): Record<string, DslAttributeMap> {
  const found: Record<string, DslAttributeMap> = {};
  const visit = (node: SerializedNode) => {
    for (const child of childrenOf(node)) {
      const original = child.$originalId;
      const diff = original === undefined ? {} : differingAttributes(attributesOf(child), primary.get(original) ?? {});

      if (original !== undefined && Object.keys(diff).length > 0) {
        found[original] = diff;
      }

      visit(child);
    }
  };

  visit(replica);

  return found;
}

/**
 * Overrides other variants of the scope hold for the deleted primary nodes (`<replica id><node id>`): DEL removes them
 * with the node. Read in two calls: the scope's variants, then every compound id.
 */
async function replicaOverrides(
  agent: AgentPort,
  pagePath: string,
  root: SerializedNode,
  nodes: readonly NodeSnapshot[],
): Promise<Record<string, Record<string, DslAttributeMap>>> {
  const scopeId = root.$scopeId;
  const plain = nodes.filter((node) => node.replicaOf === null);

  if (scopeId === undefined || root.$isReplica || plain.length === 0) {
    return {};
  }

  const scope = (await readNodes(agent, pagePath, [scopeId], 1)).get(scopeId);
  const replicas = scope === undefined ? [] : childrenOf(scope).filter((variant) => variant.$isReplica);
  const compound = replicas.flatMap((replica) => plain.map((node) => `${replica.id}${node.id}`));
  const current = await readNodes(agent, pagePath, compound, 0);
  const overrides: Record<string, Record<string, DslAttributeMap>> = {};

  for (const replica of replicas) {
    for (const node of plain) {
      const copy = current.get(`${replica.id}${node.id}`);
      const diff = copy === undefined ? {} : differingAttributes(attributesOf(copy), node.attributes);

      if (Object.keys(diff).length > 0) {
        overrides[replica.id] = {
          ...overrides[replica.id],
          [node.id]: diff,
        };
      }
    }
  }

  return overrides;
}
