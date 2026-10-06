/** A link style in the DSL: Framer's link style preset, which text takes with `linkStylePreset`. */
export const LINK_STYLE_NODE_TYPE = "LinkStylePresetNode";

/**
 * Where each state of a link style lives in the DSL: the link as it rests, under the pointer, and when it points to the
 * page being viewed (the active item of a menu).
 */
export const LINK_STATE_PREFIXES = {
  base: "link",
  hover: "link.hover",
  current: "link.current",
} as const;

/** Each input field of a state and the DSL attribute it sets in that state (`link.hover.textColor`). */
export const LINK_STYLE_FIELDS = [
  ["color", "textColor"],
  ["decoration", "textDecoration"],
  ["decorationColor", "textDecorationColor"],
  ["decorationStyle", "textDecorationStyle"],
  ["decorationThickness", "textDecorationThickness"],
  ["decorationOffset", "textDecorationOffset"],
  ["backgroundColor", "textBackgroundColor"],
  ["backgroundRadius", "textBackgroundRadius"],
  ["backgroundPadding", "textBackgroundPadding"],
] as const;

export const LINK_DECORATION_STYLES = ["solid", "double", "dotted", "dashed", "wavy"] as const;

/**
 * Values Framer does not store, in any state, because a link has them anyway: written, they read back as unset (seen
 * 06.10.2026). Radius and padding are spelled out as four values. `solid` decoration style is stored.
 */
export const LINK_UNSTORED_VALUES: ReadonlyMap<string, string> = new Map([
  ["textDecoration", "none"],
  ["textDecorationThickness", "auto"],
  ["textDecorationOffset", "auto"],
  ["textBackgroundRadius", "0px 0px 0px 0px"],
  ["textBackgroundPadding", "0px 0px 0px 0px"],
]);

/**
 * How a link style animates between its states. Framer takes only tween easing there and refuses spring-physics,
 * spring-duration and instant ("Unsupported transition type", seen 06.10.2026); Sitewright writes springs only, so it
 * never sets one: a link changes color at once, and a tween a style already has can be removed.
 */
export const LINK_TRANSITION = "link.transition";

/** The color Framer gives a link style created without one: its default link blue (seen 06.10.2026). */
export const FRAMER_LINK_BLUE = "#0099ff";
