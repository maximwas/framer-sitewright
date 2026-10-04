import { FILL_SIZES, FIT_SIZES } from "../constants/layout-audit.ts";
import type { SerializedNode } from "../types/dsl.ts";
import type { AuditContext, AuditIssue, AuditSeverity, SizeKind } from "../types/layout-audit.ts";

/** An attribute as a string, or null when unset; numbers and booleans as Framer prints them. */
export function attr(node: SerializedNode, name: string): string | null {
  const value = node.attributes?.[name];

  if (typeof value === "string") {
    return value === "" ? null : value;
  }

  return typeof value === "number" || typeof value === "boolean" ? String(value) : null;
}

/** The node's children that are nodes (a truncated read has none). */
export function childrenOf(node: SerializedNode): SerializedNode[] {
  return (node.children ?? []).filter(isNode);
}

export function isNode(value: unknown): value is SerializedNode {
  return typeof value === "object" && value !== null && "type" in value && "id" in value;
}

export function isText(node: SerializedNode): boolean {
  return node.type === "RichTextNode";
}

export function isFrame(node: SerializedNode): boolean {
  return node.type === "FrameNode";
}

export function layoutOf(node: SerializedNode): string | null {
  return attr(node, "layout");
}

/** A stack's direction; Framer's default is vertical. */
export function directionOf(node: SerializedNode): string {
  return attr(node, "stackDirection") ?? "vertical";
}

/** Where a stack puts children across its direction; Framer's default is center. */
export function crossAlignmentOf(node: SerializedNode): string {
  return attr(node, "stackAlignment") ?? "center";
}

/** In the flow of its parent's layout, not pinned on top of it. */
export function inFlow(node: SerializedNode): boolean {
  const position = attr(node, "position");

  return position !== "absolute" && position !== "fixed";
}

export function sizeKind(value: string | null): SizeKind {
  if (value === null) {
    return "unset";
  }

  if (value.endsWith("fr") || FILL_SIZES.has(value)) {
    return "fill";
  }

  if (FIT_SIZES.has(value)) {
    return "fit";
  }

  return value.endsWith("px") ? "fixed" : "relative";
}

/** The first number of a px value ("20px", "20px 20px 0px 0px"), or null. */
export function px(value: string | null): number | null {
  const match = value === null ? null : /^(-?\d+(?:\.\d+)?)px\b/.exec(value.trim());

  return match?.[1] === undefined ? null : Number(match[1]);
}

/** Padding sides in px: top, right, bottom, left (CSS shorthand). */
export function paddingOf(node: SerializedNode): readonly [number, number, number, number] {
  const parts = (attr(node, "padding") ?? "0px")
    .trim()
    .split(/\s+/)
    .map((part) => px(part) ?? 0);
  const [top = 0, right = top, bottom = top, left = right] = parts;

  return [top, right, bottom, left];
}

/** A visible surface: a card or a band, not a plain wrapper. */
export function hasSurface(node: SerializedNode): boolean {
  return attr(node, "fill") !== null || attr(node, "border") !== null || attr(node, "backgroundImage") !== null;
}

/** Where a fill-width text's lines sit: its own alignment, else its text style's. */
export function textAnchorOf(node: SerializedNode, context: AuditContext): string {
  const own = attr(node, "textAlignment");
  const alignment = own ?? context.textStyle(node.attributes?.["textStylePreset"])?.alignment ?? "left";

  return anchor(alignment);
}

/** start, center or end, whatever the alignment's spelling. */
export function anchor(alignment: string): string {
  if (alignment === "center") {
    return "center";
  }

  return alignment === "right" || alignment === "end" ? "end" : "start";
}

/** Every descendant, depth first, the node itself first. */
export function walk(node: SerializedNode): SerializedNode[] {
  return [node, ...childrenOf(node).flatMap(walk)];
}

/** Plain text of a text node, when the read carried it. */
export function textContent(node: SerializedNode): string | null {
  const text = node.attributes?.["text"];

  return typeof text === "string" ? text : null;
}

export function issue(
  rule: string,
  severity: AuditSeverity,
  node: SerializedNode,
  message: string,
  fix: string,
): AuditIssue {
  return {
    rule,
    severity,
    nodeId: node.id,
    nodeName: node.name ?? null,
    message,
    fix,
  };
}

/** How a node is called in a message: its name, else its type. */
export function label(node: SerializedNode): string {
  return `"${node.name ?? node.type}"`;
}
