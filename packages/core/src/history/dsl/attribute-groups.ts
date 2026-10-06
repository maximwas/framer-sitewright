import { FIELD_ONLY_GROUPS } from "../../constants/history.ts";
import type { DslAttributeMap } from "../../types/history.ts";

// serialize() reports effects as objects (appearEffect: { enter: { … } }) and shadows as lists; the journal keeps them
// as dotted DSL keys (appearEffect.enter.opacity, boxShadows.0). An effect is one thing to Framer: a batch that adds it
// is undone by removing it whole (`appearEffect="null"`), not by clearing each field. Lists keep a null per index,
// which is how the DSL removes an item. A page's metadata is no effect: only its fields can be cleared.

/** Marks a group as present when a map holds its fields but not the group key itself. */
const PRESENT = Symbol("present");

/** The effect a dotted key belongs to, or null for a plain key, a list item (`boxShadows.0`) or a metadata field. */
function groupOf(key: string): string | null {
  const [root, next] = key.split(".");

  return next === undefined || root === undefined || /^\d+$/.test(next) || FIELD_ONLY_GROUPS.has(root) ? null : root;
}

/** A key's value, where a group asked for by its own name counts as present when any of its fields is set. */
export function valueIn(attributes: DslAttributeMap, key: string): unknown {
  if (key in attributes) {
    return attributes[key] ?? null;
  }

  return Object.keys(attributes).some((other) => other.startsWith(`${key}.`)) ? PRESENT : null;
}

/** One side of a change, with each effect that side lacks entirely (and the other has) as `<effect>: null`. */
export function collapseAbsentGroups(
  side: DslAttributeMap,
  own: DslAttributeMap,
  other: DslAttributeMap,
): DslAttributeMap {
  const collapsed: Record<string, DslAttributeMap[string]> = {};

  for (const [key, value] of Object.entries(side)) {
    const group = groupOf(key);

    if (group !== null && valueIn(own, group) === null && valueIn(other, group) !== null) {
      collapsed[group] = null;
    } else {
      collapsed[key] = value;
    }
  }

  return collapsed;
}

/** Attributes after a SET: `<effect>: null` drops the effect's fields too. */
export function withAttributes(current: DslAttributeMap, changes: DslAttributeMap): DslAttributeMap {
  const removed = Object.entries(changes).flatMap(([key, value]) => (value === null ? [`${key}.`] : []));
  const kept = Object.entries(current).filter(([key]) => !removed.some((prefix) => key.startsWith(prefix)));

  return {
    ...Object.fromEntries(kept),
    ...changes,
  };
}
