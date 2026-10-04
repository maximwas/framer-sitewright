import type { PluginNodeRecord } from "../types/plugin-nodes.ts";

/** A node the Plugin API returned, as a plain record of its fields; null for anything else. */
export function nodeRecord(value: unknown): PluginNodeRecord | null {
  if (typeof value !== "object" || value === null || !("id" in value) || typeof value.id !== "string") {
    return null;
  }

  return value as PluginNodeRecord;
}

/** A text node's plain text; null for other nodes. */
export async function textOf(node: PluginNodeRecord): Promise<string | null> {
  const getText = node.getText;

  return typeof getText === "function" ? ((await getText.call(node)) as string | null) : null;
}

/** Sets a text node's plain text; false when the node takes no text. */
export async function setTextOf(node: PluginNodeRecord, text: string): Promise<boolean> {
  const setText = node.setText;

  if (typeof setText !== "function") {
    return false;
  }

  await setText.call(node, text);

  return true;
}

export function idOf(node: PluginNodeRecord): string {
  return String(node.id);
}

export function nameOf(node: PluginNodeRecord): string | null {
  return typeof node.name === "string" ? node.name : null;
}

/** The node's layout, which decides whether its children flow. */
export function layoutOf(node: PluginNodeRecord | null): string | null {
  return node !== null && typeof node.layout === "string" ? node.layout : null;
}

/** A node's value for one DSL attribute, from what fromPluginNode made of it; `name` lives on the node itself. */
export function dslValueOf(
  node: PluginNodeRecord,
  attributes: Readonly<Record<string, string>>,
  name: string,
): string | null {
  return name === "name" ? nameOf(node) : (attributes[name] ?? null);
}
