import * as z from "zod";
import { TOKEN_MATCH_LIMIT, TOKEN_MATCH_LIMIT_MAX } from "../../constants/styles-usage.ts";
import { normalizeAssetPath } from "../../styles/asset-path.ts";
import { countOf } from "../../utils/text.ts";
import { colorDistance, fontDistance, typePx } from "../../utils/token-match.ts";
import { defineOperation } from "../define.ts";
import { slotLabels, slotsOf } from "../text-styles/slots.ts";

const FontInputSchema = z.strictObject({
  family: z.string().min(1).exactOptional(),
  weight: z.number().int().min(1).max(1000).exactOptional(),
  size: z.number().positive().describe("Font size in px."),
  lineHeight: z.number().positive().exactOptional().describe("Line height in px."),
  letterSpacing: z.number().exactOptional().describe("Letter spacing in px (Figma's -2% of 18px is -0.36)."),
});

export const tokensMatch = defineOperation({
  name: "tokens.match",
  effect: "read",
  idempotent: true,
  permissions: [],
  input: z.strictObject({
    colors: z
      .array(z.string().min(1))
      .max(50)
      .default([])
      .describe('Colors from the design, e.g. ["#1f1b16", "rgba(255,255,255,0.1)"].'),
    fonts: z.array(FontInputSchema).max(30).default([]).describe("Fonts from the design, sizes in px."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(TOKEN_MATCH_LIMIT_MAX)
      .default(TOKEN_MATCH_LIMIT)
      .describe("Candidates per value."),
  }),
  output: z.object({
    colors: z.array(
      z.object({
        color: z.string(),
        matches: z.array(
          z.object({
            token: z.string(),
            id: z.string(),
            mode: z.enum(["light", "dark"]),
            value: z.string(),
            /** CIEDE2000 plus 50 per full step of opacity: under 1 reads the same, under 3 close. */
            distance: z.number(),
          }),
        ),
      }),
    ),
    fonts: z.array(
      z.object({
        font: FontInputSchema,
        matches: z.array(
          z.object({
            style: z.string(),
            id: z.string(),
            /** The slot that matched: null for the style's base, else its breakpoint label. */
            breakpoint: z.string().nullable(),
            /** The style's value minus the design's, for each that differs; family true when it is another family. */
            differences: z.record(z.string(), z.union([z.number(), z.boolean()])),
            score: z.number(),
          }),
        ),
      }),
    ),
  }),
  async run({ runtime }, { colors, fonts, limit }) {
    const [tokens, styles] = await Promise.all([
      colors.length === 0 ? [] : runtime.port.getColorStyles(),
      fonts.length === 0 ? [] : runtime.port.getTextStyles(),
    ]);

    return {
      colors: colors.map((color) => ({
        color,
        matches: tokens
          .flatMap((token) =>
            (
              [
                ["light", token.light],
                ["dark", token.dark],
              ] as const
            ).flatMap(([mode, value]) => {
              const found = value === null ? null : colorDistance(color, value);

              return found === null || value === null
                ? []
                : [
                    {
                      token: normalizeAssetPath(token.path),
                      id: token.id,
                      mode,
                      value,
                      distance: found,
                    },
                  ];
            }),
          )
          .sort((a, b) => a.distance - b.distance)
          .slice(0, limit),
      })),
      fonts: fonts.map((font) => ({
        font,
        matches: styles
          .flatMap((style) => {
            const slots = slotsOf(style);
            const labels = slotLabels(slots.length - 1);

            return slots.flatMap((slot, index) => {
              const size = typePx(slot.fontSize, 16);

              if (size === null) {
                return [];
              }

              const { score, differences } = fontDistance(font, style.font, {
                size,
                lineHeight: typePx(slot.lineHeight, size),
                letterSpacing: typePx(slot.letterSpacing, size),
              });

              return [
                {
                  style: normalizeAssetPath(style.path),
                  id: style.id,
                  breakpoint: index === 0 ? null : (labels[index - 1] ?? null),
                  differences,
                  score,
                },
              ];
            });
          })
          .sort((a, b) => a.score - b.score)
          .slice(0, limit),
      })),
    };
  },
  describe({ colors, fonts }) {
    return {
      subject: [countOf(colors.length, "color"), countOf(fonts.length, "font")].join(", "),
    };
  },
});
