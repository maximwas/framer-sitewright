import { clampRgb, converter, formatRgb, parse } from "culori";
import { OperationError } from "../errors.ts";

const toRgb = converter("rgb");

/** Any CSS color → Framer's canonical `rgb(r, g, b)` / `rgba(r, g, b, a)`, clamped into sRGB. */
export function normalizeColor(input: string): string {
  const parsed = parse(input.trim());

  if (!parsed) {
    throw new OperationError(
      "INVALID_COLOR",
      `Unrecognized color "${input}".`,
      "Use hex (#2563eb), rgb(), hsl(), oklch() or a CSS color name.",
    );
  }

  return formatRgb(clampRgb(toRgb(parsed)));
}

/** Whether two CSS colors are the same once normalized. */
export function sameColor(a: string, b: string): boolean {
  return normalizeColor(a) === normalizeColor(b);
}
