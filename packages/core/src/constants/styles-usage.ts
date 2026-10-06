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

/** What a page-only reading cannot tell. */
export const PAGE_USAGE_NOTE =
  "Only this page was read: a style unused here may be used on other pages or in components. Read the whole site (no pagePath) before deleting a style.";
