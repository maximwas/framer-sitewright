import type { TextAlignment } from "../types/framer-port.ts";
import type { BreakpointLabel, PlainAttributes } from "../types/text-styles.ts";

export const TEXT_STYLE_TAGS = ["h1", "h2", "h3", "h4", "h5", "h6", "p"] as const;

export const TEXT_TRANSFORMS = ["none", "inherit", "capitalize", "uppercase", "lowercase"] as const;

/** The alignments Framer stores: physical ones only. */
export const TEXT_ALIGNMENTS = ["left", "center", "right", "justify"] as const;

export const TEXT_DECORATIONS = ["none", "underline", "line-through"] as const;

/** Breakpoint slot labels, widest first, as in the tool input. */
export const BREAKPOINT_LABELS = ["large", "medium", "small", "extraSmall"] as const;

/** The Plugin API throws above this many breakpoints per text style. */
export const MAX_BREAKPOINTS = 4;

/**
 * What Framer renames a text style to when `tag` is set on it through the Plugin API (TextStyle.setAttributes), whatever
 * its name was: seen live on 04.10.2026 (p → "Body", h2 → "Heading 2"). The fake port does the same.
 */
export const FRAMER_TAG_STYLE_NAMES: Readonly<Record<string, string>> = {
  p: "Body",
  h1: "Heading 1",
  h2: "Heading 2",
  h3: "Heading 3",
  h4: "Heading 4",
  h5: "Heading 5",
  h6: "Heading 6",
};

/** The Plugin API knows only physical alignments. */
export const PLUGIN_API_ALIGNMENTS: Record<NonNullable<PlainAttributes["alignment"]>, TextAlignment> = {
  start: "left",
  end: "right",
  left: "left",
  center: "center",
  right: "right",
  justify: "justify",
};

/** The order the DSL adds breakpoint slots in; a later slot needs the earlier ones (framer_docs, text style presets). */
export const DSL_SLOT_ORDER = ["medium", "small", "extraSmall"] as const;

/**
 * The labels of a text style's breakpoint slots, widest first, by how many slots the style has: a label names a place,
 * not a width (framer_docs, text style preset breakpoints). Adding `large` makes four and moves the others down.
 */
export const SLOT_LABELS_BY_REPLICAS: Readonly<Record<number, readonly BreakpointLabel[]>> = {
  1: ["medium"],
  2: ["medium", "small"],
  3: ["medium", "small", "extraSmall"],
  4: ["large", "medium", "small", "extraSmall"],
};

/** A width in px, e.g. a breakpoint frame's "1440px". */
export const PIXEL_WIDTH = /^(\d+(?:\.\d+)?)px$/;

/** The DSL node type of a text style and of each of its breakpoint slots. */
export const TEXT_STYLE_NODE_TYPE = "TextStylePresetNode";
