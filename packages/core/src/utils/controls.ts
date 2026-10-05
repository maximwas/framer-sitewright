import type { ControlledNode } from "../types/framer-port.ts";
import { isPlainObject } from "./guards.ts";

/** A component instance whose control values setAttributes can change. */
export function isControlledNode(node: unknown): node is ControlledNode {
  return (
    typeof node === "object" &&
    node !== null &&
    "controls" in node &&
    isPlainObject(node.controls) &&
    "setAttributes" in node &&
    typeof node.setAttributes === "function"
  );
}

/**
 * The instance's controls with `patch` applied. An object control (a code component's arrows or dots) merges with its
 * current value, so a patch of one field keeps the others; anything else replaces the value.
 */
export function mergeControls(
  current: Readonly<Record<string, unknown>>,
  patch: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  return Object.fromEntries([
    ...Object.entries(current),
    ...Object.entries(patch).map(([key, value]) => {
      const previous = current[key];

      return [
        key,
        isPlainObject(value) && isPlainObject(previous)
          ? {
              ...previous,
              ...value,
            }
          : value,
      ];
    }),
  ]);
}
