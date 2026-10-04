import type { AttributeRule } from "../types/plugin-nodes.ts";

const FRAME = ["FrameNode"] as const;
const TEXT = ["RichTextNode"] as const;

/** The DSL type of each Plugin API node class the panel and the XML know; others keep their class name. */
export const DSL_TYPE_OF_PLUGIN_CLASS: Readonly<Record<string, string>> = {
  FrameNode: "FrameNode",
  TextNode: "RichTextNode",
};

/** Node types the Plugin API path can create; everything else needs framer.agent (a Server API key). */
export const PLUGIN_CREATABLE_TYPES: ReadonlySet<string> = new Set(["FrameNode", "RichTextNode"]);

/** The parent layouts whose children flow: the Plugin API reports them as absolute at 0,0, the DSL as relative. */
export const FLOW_LAYOUTS: ReadonlySet<string> = new Set(["stack", "grid"]);

/** Pins a flowing child does not have. */
export const PIN_ATTRIBUTES: ReadonlySet<string> = new Set([
  "top",
  "right",
  "bottom",
  "left",
  "centerAnchorX",
  "centerAnchorY",
]);

/**
 * Plugin API values left out when reading, as the DSL leaves them out: the defaults (visible, fully opaque, not
 * rotated, not wrapping).
 */
export const PLUGIN_DEFAULT_VALUES: Readonly<Record<string, string>> = {
  visible: "true",
  opacity: "1",
  rotation: "0deg",
  stackWrapEnabled: "false",
};

/**
 * The DSL attributes the Plugin API can set as well (spike 16, 04.10.2026), and how their values convert. Everything
 * else (effects, transitions, text color and type on the node, rich text blocks, shadows, image and gradient fills)
 * needs framer.agent.
 */
export const PLUGIN_ATTRIBUTE_RULES: readonly AttributeRule[] = [
  {
    dsl: "name",
    plugin: "name",
    kind: "text",
  },
  {
    dsl: "visible",
    plugin: "visible",
    kind: "boolean",
  },
  {
    dsl: "opacity",
    plugin: "opacity",
    kind: "number",
  },
  {
    dsl: "rotation",
    plugin: "rotation",
    kind: "degrees",
  },
  {
    dsl: "position",
    plugin: "position",
    kind: "text",
  },
  {
    dsl: "top",
    plugin: "top",
    kind: "px",
  },
  {
    dsl: "right",
    plugin: "right",
    kind: "px",
  },
  {
    dsl: "bottom",
    plugin: "bottom",
    kind: "px",
  },
  {
    dsl: "left",
    plugin: "left",
    kind: "px",
  },
  {
    dsl: "centerAnchorX",
    plugin: "centerX",
    kind: "text",
  },
  {
    dsl: "centerAnchorY",
    plugin: "centerY",
    kind: "text",
  },
  {
    dsl: "width",
    plugin: "width",
    kind: "size",
  },
  {
    dsl: "height",
    plugin: "height",
    kind: "size",
  },
  {
    dsl: "minWidth",
    plugin: "minWidth",
    kind: "px",
  },
  {
    dsl: "maxWidth",
    plugin: "maxWidth",
    kind: "px",
  },
  {
    dsl: "minHeight",
    plugin: "minHeight",
    kind: "px",
  },
  {
    dsl: "maxHeight",
    plugin: "maxHeight",
    kind: "px",
  },
  {
    dsl: "aspectRatio",
    plugin: "aspectRatio",
    kind: "number",
  },
  {
    dsl: "zIndex",
    plugin: "zIndex",
    kind: "number",
  },
  {
    dsl: "overflow",
    plugin: "overflow",
    kind: "text",
  },
  {
    dsl: "overflowX",
    plugin: "overflowX",
    kind: "text",
  },
  {
    dsl: "overflowY",
    plugin: "overflowY",
    kind: "text",
  },
  {
    dsl: "link",
    plugin: "link",
    kind: "text",
  },
  {
    dsl: "link.openInNewTab",
    plugin: "linkOpenInNewTab",
    kind: "boolean",
  },
  {
    dsl: "link.smoothScroll",
    plugin: "linkSmoothScroll",
    kind: "boolean",
  },
  {
    dsl: "gridItemHorizontalAlignment",
    plugin: "gridItemHorizontalAlignment",
    kind: "text",
  },
  {
    dsl: "gridItemVerticalAlignment",
    plugin: "gridItemVerticalAlignment",
    kind: "text",
  },
  {
    dsl: "gridItemColumnSpan",
    plugin: "gridItemColumnSpan",
    kind: "countOrKeyword",
  },
  {
    dsl: "gridItemRowSpan",
    plugin: "gridItemRowSpan",
    kind: "number",
  },
  {
    dsl: "fill",
    plugin: "backgroundColor",
    kind: "color",
    only: FRAME,
  },
  {
    dsl: "radius",
    plugin: "borderRadius",
    kind: "text",
    only: FRAME,
  },
  {
    dsl: "border",
    plugin: "border",
    kind: "border",
    only: FRAME,
  },
  {
    dsl: "layout",
    plugin: "layout",
    kind: "text",
    only: FRAME,
  },
  {
    dsl: "gap",
    plugin: "gap",
    kind: "text",
    only: FRAME,
  },
  {
    dsl: "padding",
    plugin: "padding",
    kind: "text",
    only: FRAME,
  },
  {
    dsl: "stackDirection",
    plugin: "stackDirection",
    kind: "text",
    only: FRAME,
  },
  {
    dsl: "stackDistribution",
    plugin: "stackDistribution",
    kind: "text",
    only: FRAME,
  },
  {
    dsl: "stackAlignment",
    plugin: "stackAlignment",
    kind: "text",
    only: FRAME,
  },
  {
    dsl: "stackWrapEnabled",
    plugin: "stackWrapEnabled",
    kind: "boolean",
    only: FRAME,
  },
  {
    dsl: "gridColumnCount",
    plugin: "gridColumnCount",
    kind: "countOrKeyword",
    only: FRAME,
  },
  {
    dsl: "gridRowCount",
    plugin: "gridRowCount",
    kind: "number",
    only: FRAME,
  },
  {
    dsl: "gridAlignment",
    plugin: "gridAlignment",
    kind: "text",
    only: FRAME,
  },
  {
    dsl: "gridColumnWidth",
    plugin: "gridColumnWidth",
    kind: "pxNumber",
    only: FRAME,
  },
  {
    dsl: "gridColumnMinWidth",
    plugin: "gridColumnMinWidth",
    kind: "pxNumber",
    only: FRAME,
  },
  {
    dsl: "gridRowHeightType",
    plugin: "gridRowHeightType",
    kind: "text",
    only: FRAME,
  },
  {
    dsl: "gridRowHeight",
    plugin: "gridRowHeight",
    kind: "pxNumber",
    only: FRAME,
  },
  {
    dsl: "textStylePreset",
    plugin: "inlineTextStyle",
    kind: "textStyle",
    only: TEXT,
  },
  {
    dsl: "textTruncation",
    plugin: "textTruncation",
    kind: "number",
    only: TEXT,
  },
];

/** A token reference as the DSL writes it; the group is the token id. */
export const TOKEN_VALUE = /^var\(--token-([\w-]+)\)$/;

/** The border styles the Plugin API knows. */
export const BORDER_STYLES: ReadonlySet<string> = new Set(["solid", "dashed", "dotted", "double"]);
