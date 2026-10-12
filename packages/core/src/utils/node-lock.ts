import { NODE_TYPE_LABELS } from "../constants/history.ts";
import { DSL_TYPE_OF_PLUGIN_CLASS } from "../constants/plugin-nodes.ts";
import type { NodeLockState, NodeLockStep } from "../types/history.ts";

/**
 * A layer's lock as getNode reads it, named for lists by its layer name or its type; null for a node that takes no
 * lock (a page) or no node at all.
 */
export function lockStateOf(node: unknown): NodeLockState | null {
  if (typeof node !== "object" || node === null || !("locked" in node) || typeof node.locked !== "boolean") {
    return null;
  }

  const name = "name" in node && typeof node.name === "string" ? node.name : null;
  const className = "__class" in node && typeof node.__class === "string" ? node.__class : "Layer";
  const type = DSL_TYPE_OF_PLUGIN_CLASS[className] ?? className;

  return {
    path: name ?? NODE_TYPE_LABELS[type] ?? type,
    locked: node.locked,
  };
}

export function nodeLockStep(id: string, before: NodeLockState, after: NodeLockState): NodeLockStep {
  return {
    kind: "node-lock",
    id,
    before,
    after,
  };
}
