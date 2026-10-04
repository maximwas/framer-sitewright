import type * as z from "zod";
import type { TextStyleOutputSchema } from "../../schemas/text-styles.ts";
import { normalizeAssetPath } from "../../styles/asset-path.ts";
import type { TextStyleData } from "../../types/framer-port.ts";
import { slotLabels, slotsOf } from "./slots.ts";

/**
 * A text style as tools show it: canonical paths, the color as a token path or a raw value, and every slot with the
 * width it starts at, the way pages use it; breakpoints also with the label the input and the DSL name them by.
 */
export function toTextStyleOutput(style: TextStyleData): z.input<typeof TextStyleOutputSchema> {
  const [base, ...breakpoints] = slotsOf(style);
  const labels = slotLabels(breakpoints.length);

  return {
    id: style.id,
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
            token: null,
            value: style.color,
          }
        : {
            token: normalizeAssetPath(style.color.path),
            value: style.color.light,
          },
    fontSize: style.fontSize,
    lineHeight: style.lineHeight,
    letterSpacing: style.letterSpacing,
    paragraphSpacing: style.paragraphSpacing,
    transform: style.transform,
    alignment: style.alignment,
    decoration: style.decoration,
    balance: style.balance,
    minWidth: base?.minWidth ?? style.minWidth,
    breakpoints: breakpoints.map((slot, index) => ({
      label: labels[index] ?? null,
      ...slot,
    })),
  };
}
