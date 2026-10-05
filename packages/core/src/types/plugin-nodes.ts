import type { GradientSpec } from "./framer.ts";
import type { ColorStyleHandle, TextStyleHandle } from "./framer-port.ts";
import type { DslAttributeMap, NodeSnapshot } from "./history.ts";
import type { XmlElementNode } from "./xml.ts";

/**
 * How a DSL attribute's string value turns into the Plugin API's value and back:
 * - `text`: the same string;
 * - `boolean`, `number`: parsed;
 * - `degrees`: "15deg" ↔ 15;
 * - `size`: "auto" ↔ "fit-content", the rest as is;
 * - `px`: a bare number gets "px";
 * - `pxNumber`: "120px" ↔ 120;
 * - `countOrKeyword`: a number, or a keyword such as "auto-fill" / "all";
 * - `color`: a color, or a token as var(--token-<id>) ↔ the ColorStyle;
 * - `border`: "1px solid #000" ↔ { width, style, color };
 * - `textStyle`: a text style's name or id ↔ the TextStyle.
 */
/** An image fill by URL: uploaded and set as the frame's backgroundImage when the batch runs. */
export interface PendingImage {
  readonly imageUrl: string;
}

/** A linear gradient fill: built from Framer's gradient class (runtime.createGradient) when the batch runs. */
export interface PendingGradient {
  readonly gradient: GradientSpec;
}

export type AttributeValueKind =
  | "text"
  | "boolean"
  | "number"
  | "degrees"
  | "size"
  | "px"
  | "pxNumber"
  | "countOrKeyword"
  | "color"
  | "border"
  | "textStyle";

/** One DSL attribute the Plugin API can set too. `only`: the DSL types that have it; absent, every canvas node. */
export interface AttributeRule {
  readonly dsl: string;
  readonly plugin: string;
  readonly kind: AttributeValueKind;
  readonly only?: readonly string[];
}

/** The project's styles, so tokens and text styles become the objects the Plugin API wants. */
export interface StyleLookup {
  readonly colors: readonly ColorStyleHandle[];
  readonly texts: readonly TextStyleHandle[];
}

/** DSL attributes as Plugin API attributes; what cannot be translated is reported, not dropped. */
export interface PluginAttributes {
  readonly attributes: Record<string, unknown>;
  /** A RichTextNode's text, set with setText. */
  readonly text: string | null;
  /** Attributes only the DSL has, i.e. that need a Server API key. */
  readonly unsupported: readonly string[];
  /** Attributes the Plugin API has, with a value it cannot take, and why. */
  readonly invalid: readonly string[];
}

/** A canvas node as the Plugin API reads it: its own fields by name; `getText` on text nodes. */
export type PluginNodeRecord = Readonly<Record<string, unknown>>;

/** Where a new node goes: an existing node, a `key` created earlier in the batch, or the new element it is nested in. */
export type ParentRef = { readonly id: string } | { readonly key: string } | { readonly ref: string };

/** One Plugin API step of design_apply without the agent, in tree order. */
export type NodePlan =
  | {
      readonly kind: "create";
      readonly element: XmlElementNode;
      readonly type: string;
      /** How nested elements and the answer's keys find the new node. */
      readonly ref: string;
      readonly parent: ParentRef;
      readonly index: number | null;
      /** DSL attributes as written, `@key` references unresolved. */
      readonly attributes: Readonly<Record<string, string>>;
      readonly text: string | null;
    }
  | {
      readonly kind: "update";
      readonly element: XmlElementNode;
      readonly id: string;
      readonly attributes: Readonly<Record<string, string>>;
      readonly text: string | null;
    }
  | { readonly kind: "delete"; readonly element: XmlElementNode; readonly id: string };

/** A page breakpoint to add: the frame's name ("Tablet") and the window width it starts at, in px. */
export interface BreakpointSpec {
  readonly name: string;
  readonly width: number;
}

/**
 * A web page that adds breakpoints: WebPageNode.addBreakpoint, `@alpha` in @framer/plugin 5.1 and framer-api 5.1 but
 * present on both. The new frame replicates `basedOn` (the primary breakpoint).
 */
export interface BreakpointPage {
  readonly id: string;
  addBreakpoint(basedOn: string, breakpoint: { name: string; width: number }): Promise<unknown>;
}

/**
 * A deleted subtree as undo keeps it. A replica (a breakpoint other than the primary) is one node that says what it
 * replicates, plus the overrides its layers held: Framer recreates the layers with the breakpoint.
 */
export interface PluginDeletion {
  readonly nodes: NodeSnapshot[];
  readonly overrides: Record<string, Record<string, DslAttributeMap>>;
}
