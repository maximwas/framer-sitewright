import { LINK_STYLE_NODE_TYPE } from "./link-styles.ts";

/** The kinds of style styles_usage reports, as getDescendantReferencesOfTypes names them. */
export const STYLE_REFERENCE_TYPES = ["ColorStyleTokenNode", "TextStylePresetNode", LINK_STYLE_NODE_TYPE] as const;

/**
 * The layers whose values can name a token or a style: everything on a canvas but pages. Rich text is read down to its
 * blocks, list items and runs, which carry their own colors and link styles.
 */
export const USAGE_LAYER_TYPES = [
  "FrameNode",
  "RichTextNode",
  "TextBlock",
  "TextBulletList",
  "TextNumberedList",
  "TextListItem",
  "TextRun",
  "ComponentInstanceNode",
  "IconNode",
  "RelativeOverlayNode",
  "FixedOverlayNode",
  "ShaderNode",
  "FormPlainTextInputNode",
  "FormSelectNode",
  "FormBooleanInputNode",
] as const;

/** Attributes that name a text style: a text's own, and the per-tag ones of rich text bound to a variable. */
export const TEXT_STYLE_REFERENCE = /^(?:textStylePreset|stylePreset(?:Heading[1-6]|Paragraph))$/;

/** The attribute that names a link style, on rich text and on a run of it. */
export const LINK_STYLE_REFERENCE = "linkStylePreset";

/** Scopes besides web pages that hold layers, and how usedIn names them. */
export const USAGE_SCOPE_KINDS: ReadonlyMap<string, string> = new Map([
  ["ComponentNode", "component"],
  ["DesignPageNode", "design page"],
  ["LayoutTemplateNode", "layout"],
]);

/** The px a rem is, as browsers set it by default. */
export const ROOT_FONT_SIZE_PX = 16;

/**
 * How tokens_match weighs a text style's differences from a design's font into one score: per px of size, line height
 * and letter spacing, per 100 of weight, and a flat cost for another family.
 */
export const FONT_MATCH_WEIGHTS = {
  family: 20,
  weight: 2,
  size: 1,
  lineHeight: 0.5,
  letterSpacing: 2,
} as const;

/** How many candidates tokens_match gives per value by default, and at most. */
export const TOKEN_MATCH_LIMIT = 3;
export const TOKEN_MATCH_LIMIT_MAX = 10;

/** What a page-only reading cannot tell. */
export const PAGE_USAGE_NOTE =
  "Only this page and the components placed on it were read: a style unused here may be used on other pages or in other components. Read the whole site (no pagePath) before deleting a style.";
