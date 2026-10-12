import { BORDER_SHORTHAND_WIDTH, BORDER_SIDE_KEYS, BORDER_STYLES, BORDER_WIDTH_KEYS } from "../constants/components.ts";
import { isPlainObject } from "./guards.ts";

/**
 * A border control's value from a CSS-like shorthand: widths in CSS order (one for every side, or top right bottom
 * left), then the style and the color, e.g. "1px solid var(--token-…)" or "0 0 1px 1px solid #e5e5e5". Framer keeps one
 * width as borderWidth and four as borderTopWidth… (seen 12.10.2026). Null when the text is not a border.
 */
export function borderFromShorthand(text: string): Record<string, unknown> | null {
  const parts = shorthandParts(text);
  const widths: number[] = [];

  while (widths.length < parts.length && BORDER_SHORTHAND_WIDTH.test(parts[widths.length] ?? "")) {
    widths.push(Number.parseFloat(parts[widths.length] ?? "0"));
  }

  const [top, right = top, bottom = top, left = right] = widths;

  if (top === undefined || right === undefined || bottom === undefined || left === undefined || widths.length > 4) {
    return null;
  }

  const rest = parts.slice(widths.length);
  const style = BORDER_STYLES.includes(rest[0] ?? "") ? rest.shift() : undefined;
  const color = rest.join(" ");

  return {
    ...(color === "" ? {} : { borderColor: color }),
    ...(style === undefined ? {} : { borderStyle: style }),
    ...(top === right && top === bottom && top === left
      ? { borderWidth: top }
      : {
          borderTopWidth: top,
          borderRightWidth: right,
          borderBottomWidth: bottom,
          borderLeftWidth: left,
        }),
  };
}

/** Whether a control's value is a border: a color, style or width under Framer's border keys. */
export function isBorderValue(value: unknown): boolean {
  return isPlainObject(value) && ["borderColor", "borderStyle", ...BORDER_WIDTH_KEYS].some((key) => key in value);
}

/**
 * A border patch on the current value. New widths replace every old one, so a per-side write does not carry the old
 * uniform borderWidth along (Framer then keeps the sides, and the merged value never matched what it kept).
 */
export function mergeBorder(current: unknown, patch: Readonly<Record<string, unknown>>): Record<string, unknown> {
  const previous = isPlainObject(current) ? current : {};
  const widthsChange = BORDER_WIDTH_KEYS.some((key) => key in patch);

  return {
    ...Object.fromEntries(
      Object.entries(previous).filter(([key]) => !(widthsChange && BORDER_WIDTH_KEYS.includes(key))),
    ),
    ...patch,
  };
}

/** The widths of a border control set per side, top right bottom left; null for one width on every side. */
export function borderSides(value: unknown): number[] | null {
  if (!isPlainObject(value)) {
    return null;
  }

  const sides = BORDER_SIDE_KEYS.map((key) => value[key]);

  return sides.every((side) => typeof side === "number") ? (sides as number[]) : null;
}

/** Whether a shorthand gives the sides different widths, which only the plugin can write on a control. */
export function isPerSideShorthand(text: string): boolean {
  const border = borderFromShorthand(text);

  return border !== null && "borderTopWidth" in border;
}

/** A border shorthand's words; spaces inside rgb(…) or var(…) belong to the color. */
export function shorthandParts(text: string): string[] {
  return text.trim().split(/\s+(?![^(]*\))/);
}
