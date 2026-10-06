import { normalizeAssetPath } from "../styles/asset-path.ts";
import type { ColorStyleData, TextStyleData } from "../types/framer-port.ts";
import type { ColorStyleState, LinkStyleState, TextStyleState } from "../types/history.ts";
import type { LinkStyleData } from "../types/link-styles.ts";

export function colorStyleState(style: ColorStyleData): ColorStyleState {
  return {
    path: normalizeAssetPath(style.path),
    light: style.light,
    dark: style.dark,
  };
}

export function textStyleState(style: TextStyleData): TextStyleState {
  return {
    path: normalizeAssetPath(style.path),
    tag: style.tag,
    font: {
      family: style.font.family,
      weight: style.font.weight,
      style: style.font.style,
    },
    color:
      typeof style.color === "string"
        ? {
            tokenId: null,
            value: style.color,
          }
        : {
            tokenId: style.color.id,
            value: null,
          },
    fontSize: style.fontSize,
    lineHeight: style.lineHeight,
    letterSpacing: style.letterSpacing,
    paragraphSpacing: style.paragraphSpacing,
    transform: style.transform,
    alignment: style.alignment,
    decoration: style.decoration,
    minWidth: style.minWidth,
    breakpoints: style.breakpoints.map((breakpoint) => ({
      minWidth: breakpoint.minWidth,
      fontSize: breakpoint.fontSize,
      letterSpacing: breakpoint.letterSpacing,
      lineHeight: breakpoint.lineHeight,
      paragraphSpacing: breakpoint.paragraphSpacing,
    })),
  };
}

/** Attributes in key order: Framer lists them in the order they were last set, which says nothing about the style. */
export function linkStyleState(style: LinkStyleData): LinkStyleState {
  return {
    path: style.path,
    attributes: Object.fromEntries(
      Object.entries(style.attributes).sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0)),
    ),
  };
}

/** States are plain JSON with a fixed key order, so equal states serialize identically. */
export function sameState(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
