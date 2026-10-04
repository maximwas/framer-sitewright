import { normalizeAssetPath } from "../styles/asset-path.ts";
import type { ColorStyleData, TextStyleData } from "../types/framer-port.ts";
import type { ColorStyleState, TextStyleState } from "../types/history.ts";

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

/** States are plain JSON with a fixed key order, so equal states serialize identically. */
export function sameState(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
