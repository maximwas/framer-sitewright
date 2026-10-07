import { VIRTUAL_TEXT_ID } from "../constants/history.ts";
import { tokenRef } from "../dsl/commands.ts";
import { attributesOf } from "../history/dsl/serialized.ts";
import type { SerializedNode } from "../types/dsl.ts";

/**
 * The SETs that point every value naming the old token at the new one (fills, text colors, borders, gradients), and
 * the texts whose runs name it: a run has no id of its own to SET, so those texts are listed for design_apply xml.
 */
export function tokenSwaps(nodes: readonly SerializedNode[], from: string, to: string) {
  const [before, after] = [tokenRef(from), tokenRef(to)];
  const changes: { id: string; attributes: Record<string, string> }[] = [];
  const insideText = new Set<string>();

  for (const node of nodes) {
    // serialize() keeps the values under attributes; effects and shadows come flattened to dotted keys.
    const attributes = Object.fromEntries(
      Object.entries(attributesOf(node)).flatMap(([key, value]) =>
        typeof value !== "string" || !value.includes(before) ? [] : [[key, value.replaceAll(before, after)]],
      ),
    );

    if (Object.keys(attributes).length === 0) {
      continue;
    }

    const owner = VIRTUAL_TEXT_ID.exec(node.id)?.[1];

    if (owner === undefined) {
      changes.push({
        id: node.id,
        attributes,
      });
    } else {
      insideText.add(owner);
    }
  }

  return {
    changes,
    insideText: [...insideText],
  };
}
