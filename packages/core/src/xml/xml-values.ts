import type { DslValue } from "../types/dsl.ts";
import { escapeAttribute } from "./xml-entities.ts";

/** ` a="1" b="x"`: attributes as they follow a tag name. */
export function formatAttributes(attributes: readonly (readonly [string, string])[]): string {
  return attributes.map(([name, value]) => ` ${name}="${escapeAttribute(value)}"`).join("");
}

/**
 * An attribute as the DSL would set it. An object becomes dotted names, `hoverEffect.scale="1.1"`, which design_apply
 * takes back as is; a list stays JSON.
 */
export function flattenAttribute(name: string, value: unknown): [string, string][] {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return Object.entries(value).flatMap(([inner, item]) => flattenAttribute(`${name}.${inner}`, item));
  }

  return [[name, Array.isArray(value) ? JSON.stringify(value) : scalarText(value)]];
}

/** Read-only metadata, short: `$rect="x:24 y:96 width:1152 height:534"`, lists joined by ", ". */
export function metaText(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map(metaText).join(", ");
  }

  if (value !== null && typeof value === "object") {
    return Object.entries(value)
      .map(([key, item]) => `${key}:${metaText(item)}`)
      .join(" ");
  }

  return scalarText(value);
}

/** A value as the DSL writes it: every value is text, null clears. */
function scalarText(value: unknown): string {
  return value === null || value === undefined ? "null" : String(value);
}

/**
 * A list as an XML read prints it (JSON), as the DSL writes it: one attribute per item and key, `sections.0.opacity`,
 * numbers and booleans kept as such. Framer takes a JSON string for a list but then checks every item's values as text,
 * so `sections="[{\"opacity\":0.15}]"` fails with "Expected number". An empty item has nothing to write: Framer keeps
 * the item there. Null when the value is no JSON list.
 */
export function expandListAttribute(name: string, value: string): [string, DslValue][] | null {
  if (!value.trimStart().startsWith("[")) {
    return null;
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(value);
  } catch {
    return null;
  }

  return Array.isArray(parsed) ? parsed.flatMap((item, index) => listEntries(`${name}.${index}`, item)) : null;
}

function listEntries(name: string, value: unknown): [string, DslValue][] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => listEntries(`${name}.${index}`, item));
  }

  if (value !== null && typeof value === "object") {
    return Object.entries(value).flatMap(([key, item]) => listEntries(`${name}.${key}`, item));
  }

  return typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value === null
    ? [[name, value]]
    : [];
}
