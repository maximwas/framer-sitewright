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
