import { differenceCiede2000, parse } from "culori";
import { FONT_MATCH_WEIGHTS, ROOT_FONT_SIZE_PX } from "../constants/styles-usage.ts";
import type { FontSpec, SlotSize } from "../types/token-match.ts";

const distance = differenceCiede2000();

/**
 * How far apart two CSS colors look: CIEDE2000 (under 1 reads the same, under 3 close), plus 50 per full step of
 * opacity, so a 10% white is far from a solid one; null when either is not a color.
 */
export function colorDistance(a: string, b: string): number | null {
  const first = parse(a.trim());
  const second = parse(b.trim());

  if (first === undefined || second === undefined) {
    return null;
  }

  const alpha = Math.abs((first.alpha ?? 1) - (second.alpha ?? 1));

  return Math.round((distance(first, second) + alpha * 50) * 10) / 10;
}

/** A CSS length of type in px: px as is, rem against 16px, em and % against the font size; null otherwise. */
export function typePx(value: string, fontSize: number): number | null {
  const match = /^(-?\d+(?:\.\d+)?)(px|rem|em|%)?$/.exec(value.trim());

  if (match?.[1] === undefined) {
    return null;
  }

  const number = Number(match[1]);

  switch (match[2]) {
    case "rem":
      return number * ROOT_FONT_SIZE_PX;
    case "em":
      return number * fontSize;
    case "%":
      return (number / 100) * fontSize;
    default:
      return number;
  }
}

/**
 * How far a text style's slot is from a font in a design, by what differs: px of size, line height and letter spacing,
 * steps of weight, and another family; each weighed by FONT_MATCH_WEIGHTS into one score, lower is closer.
 */
export function fontDistance(
  font: FontSpec,
  style: { family: string; weight: number | null },
  slot: SlotSize,
): { score: number; differences: Record<string, number | boolean> } {
  const differences: Record<string, number | boolean> = {};
  let score = 0;
  const add = (key: string, difference: number, weight: number) => {
    const rounded = Math.round(difference * 100) / 100;

    if (rounded !== 0) {
      differences[key] = rounded;
      score += Math.abs(rounded) * weight;
    }
  };

  if (font.family !== undefined && font.family.trim().toLowerCase() !== style.family.toLowerCase()) {
    differences.family = true;
    score += FONT_MATCH_WEIGHTS.family;
  }

  if (font.weight !== undefined) {
    add("weight", (style.weight ?? 400) - font.weight, FONT_MATCH_WEIGHTS.weight / 100);
  }

  add("size", slot.size - font.size, FONT_MATCH_WEIGHTS.size);

  if (font.lineHeight !== undefined && slot.lineHeight !== null) {
    add("lineHeight", slot.lineHeight - font.lineHeight, FONT_MATCH_WEIGHTS.lineHeight);
  }

  if (font.letterSpacing !== undefined && slot.letterSpacing !== null) {
    add("letterSpacing", slot.letterSpacing - font.letterSpacing, FONT_MATCH_WEIGHTS.letterSpacing);
  }

  return {
    score: Math.round(score * 10) / 10,
    differences,
  };
}
