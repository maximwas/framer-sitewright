import { FRAMER_NODE_ID } from "../constants/dsl.ts";
import { TOKEN_REFERENCE } from "../constants/history.ts";
import type { DslAttributeMap, NodeSnapshot, NodeState, UndoStep } from "../types/history.ts";

/**
 * Undoing a deletion recreates the item with a new id. Later steps that still name the old id, as the item itself, as
 * a text style's colour token, or inside a node's values (a parent, a replica source, `var(--token-…)`), are
 * rewritten to the newest id. `aliases` maps old id → new id, possibly in chains (a → b → c).
 */
export function applyAliases(steps: readonly UndoStep[], aliases: ReadonlyMap<string, string>): UndoStep[] {
  if (aliases.size === 0) {
    return [...steps];
  }

  const resolve = (id: string) => latestId(id, aliases);

  return steps.map((step): UndoStep => {
    if (step.kind === "color-style") {
      return {
        ...step,
        id: resolve(step.id),
      };
    }

    if (step.kind === "node") {
      return {
        ...step,
        id: resolveNodeId(step.id, resolve),
        before: step.before === null ? null : withNodeAliases(step.before, resolve),
        after: step.after === null ? null : withNodeAliases(step.after, resolve),
      };
    }

    return {
      ...step,
      id: resolve(step.id),
      before: step.before === null ? null : withToken(step.before, resolve),
      after: step.after === null ? null : withToken(step.after, resolve),
    };
  });
}

/**
 * A node state's references to other nodes and tokens follow recreated items. Ids of the snapshot's own nodes stay:
 * they name nodes the undo recreates itself, and only the snapshot's links to the outside (its parent) can move.
 */
function withNodeAliases(state: NodeState, resolve: (id: string) => string): NodeState {
  const own = new Set(state.nodes.map((node) => node.id));

  return {
    ...state,
    parentId: state.parentId === null ? null : resolve(state.parentId),
    attributes: withReferences(state.attributes, resolve),
    nodes: state.nodes.map((node) => withSnapshotAliases(node, own, resolve)),
    overrides: Object.fromEntries(
      Object.entries(state.overrides).map(([replicaId, byNode]) => [
        resolve(replicaId),
        Object.fromEntries(
          Object.entries(byNode).map(([nodeId, attributes]) => [nodeId, withReferences(attributes, resolve)]),
        ),
      ]),
    ),
  };
}

function withSnapshotAliases(node: NodeSnapshot, own: ReadonlySet<string>, resolve: (id: string) => string) {
  return {
    ...node,
    parentId: own.has(node.parentId) ? node.parentId : resolve(node.parentId),
    params: withReferences(node.params, resolve),
    attributes: withReferences(node.attributes, resolve),
    replicaOf: node.replicaOf === null ? null : resolve(node.replicaOf),
  };
}

/** Values that point at a token (`var(--token-<id>)`) or, for an instance, at its component. */
function withReferences(attributes: DslAttributeMap, resolve: (id: string) => string): DslAttributeMap {
  return Object.fromEntries(
    Object.entries(attributes).map(([key, value]) => {
      if (typeof value !== "string") {
        return [key, value];
      }

      if (key === "component") {
        return [key, resolve(value)];
      }

      return [key, value.replace(TOKEN_REFERENCE, (_reference, id: string) => `var(--token-${resolve(id)})`)];
    }),
  );
}

/** A node id, or a compound id `<variant id><node id>` whose parts may each have been recreated. */
function resolveNodeId(id: string, resolve: (id: string) => string): string {
  const resolved = resolve(id);
  const half = id.length / 2;
  const variant = id.slice(0, half);
  const node = id.slice(half);

  if (resolved !== id || !FRAMER_NODE_ID.test(variant) || !FRAMER_NODE_ID.test(node)) {
    return resolved;
  }

  return `${resolve(variant)}${resolve(node)}`;
}

function latestId(id: string, aliases: ReadonlyMap<string, string>): string {
  const seen = new Set<string>();
  let current = id;

  // A cycle cannot come from real ids, but guard against a corrupted journal.
  while (aliases.has(current) && !seen.has(current)) {
    seen.add(current);
    current = aliases.get(current) ?? current;
  }

  return current;
}

function withToken<T extends { readonly color: { readonly tokenId: string | null; readonly value: string | null } }>(
  state: T,
  resolve: (id: string) => string,
): T {
  return state.color.tokenId === null
    ? state
    : {
        ...state,
        color: {
          ...state.color,
          tokenId: resolve(state.color.tokenId),
        },
      };
}
