/** The groups of attributes styles_copy carries from one layer to others, by their DSL names. */
export const STYLE_CATEGORIES = {
  color: ["fill", "textColor", "opacity"],
  text: ["textStylePreset", "textColor", "textTruncation"],
  border: ["border", "borderTop", "borderRight", "borderBottom", "borderLeft"],
  radius: ["radius"],
  shadow: ["shadows", "boxShadows"],
  layout: [
    "layout",
    "stackDirection",
    "stackDistribution",
    "stackAlignment",
    "stackWrapEnabled",
    "gap",
    "padding",
    "gridColumnCount",
    "gridRowCount",
    "gridAlignment",
    "gridColumnWidthType",
    "gridColumnWidth",
    "gridColumnMinWidth",
    "gridRowHeightType",
    "gridRowHeight",
  ],
  size: ["width", "height", "minWidth", "maxWidth", "minHeight", "maxHeight", "aspectRatio"],
} as const;

export const STYLE_CATEGORY_NAMES = ["color", "text", "border", "radius", "shadow", "layout", "size"] as const;

/** How many layers one styles_copy call styles. */
export const STYLE_TARGETS_MAX = 50;

/** How many rounds nodes_clone detaches instances: an instance's layers can hold instances of their own. */
export const CLONE_DETACH_ROUNDS = 5;
