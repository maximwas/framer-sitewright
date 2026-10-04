import * as z from "zod";
import { FONT_STYLES, FONT_WEIGHTS } from "../constants/fonts.ts";
import { BREAKPOINT_LABELS, TEXT_STYLE_TAGS } from "../constants/text-styles.ts";
import { StyleUpsertOutputSchema } from "./styles.ts";

const FontSizeSchema = z.string().regex(/^\d+(\.\d+)?(px|rem)$/, "Use px or rem, e.g. 48px");

const LineHeightSchema = z.string().regex(/^\d+(\.\d+)?(px|em|%)$/, "Use px, em or %, e.g. 1.2em");

const LetterSpacingSchema = z.string().regex(/^-?\d+(\.\d+)?(px|em)$/, "Use px or em, e.g. -0.02em");

export const BreakpointOverrideSchema = z.strictObject({
  fontSize: FontSizeSchema.exactOptional(),
  lineHeight: LineHeightSchema.exactOptional(),
  letterSpacing: LetterSpacingSchema.exactOptional(),
  paragraphSpacing: z.number().min(0).exactOptional(),
});

export const FontInputSchema = z.strictObject({
  family: z
    .string()
    .min(1)
    .describe("Exact family from fonts_search; a family uploaded to the project works too (checked after the write)."),
  weight: z
    .literal(FONT_WEIGHTS)
    .exactOptional()
    .describe("New styles default to 400; updates keep the current weight."),
  style: z.enum(FONT_STYLES).exactOptional().describe("New styles default to normal; updates keep the current style."),
});

export const ColorInputSchema = z.strictObject({
  token: z.string().min(1).exactOptional(),
  value: z.string().min(1).exactOptional(),
});

export const TextStyleInputSchema = z.strictObject({
  path: z.string().min(1).describe('Style path with "/" folders, e.g. "Heading/H1".'),
  tag: z.enum(TEXT_STYLE_TAGS).exactOptional().describe("HTML tag. New styles default to p."),
  font: FontInputSchema.exactOptional(),
  fontSize: FontSizeSchema.exactOptional(),
  lineHeight: LineHeightSchema.exactOptional(),
  letterSpacing: LetterSpacingSchema.exactOptional(),
  paragraphSpacing: z.number().min(0).exactOptional(),
  color: ColorInputSchema.exactOptional().describe(
    '{ token: "Brand/Text" } binds a color token; { value: "#111111" } sets a raw color.',
  ),
  transform: z.enum(["none", "capitalize", "uppercase", "lowercase"]).exactOptional(),
  alignment: z.enum(["start", "center", "end", "left", "right", "justify"]).exactOptional(),
  decoration: z.enum(["none", "underline", "line-through"]).exactOptional(),
  balance: z
    .boolean()
    .exactOptional()
    .describe("Even out line lengths, so a headline never ends with one word alone. Turn it on for headings."),
  breakpoints: z
    .strictObject({
      large: BreakpointOverrideSchema.exactOptional(),
      medium: BreakpointOverrideSchema.exactOptional(),
      small: BreakpointOverrideSchema.exactOptional(),
      extraSmall: BreakpointOverrideSchema.exactOptional(),
    })
    .exactOptional()
    .describe(
      "Sizes for narrower screens, by slot. A style with 1 slot has medium; 2: medium, small; 3: medium, small, " +
        "extraSmall; 4: large, medium, small, extraSmall. Slots start at the page breakpoints from the top, the " +
        "narrowest at 0, so on a site of 1440/1280/810/390 medium alone covers everything below 1440. A skipped " +
        "earlier slot is added with the base fontSize.",
    ),
});

export const TextStyleOutputSchema = z.object({
  id: z.string(),
  path: z.string(),
  tag: z.enum(TEXT_STYLE_TAGS),
  font: z.object({
    family: z.string(),
    weight: z.number().int().nullable(),
    style: z.enum(FONT_STYLES).nullable(),
  }),
  color: z.object({
    token: z.string().nullable(),
    value: z.string(),
  }),
  fontSize: z.string(),
  lineHeight: z.string(),
  letterSpacing: z.string(),
  paragraphSpacing: z.number(),
  transform: z.string(),
  alignment: z.string(),
  decoration: z.string(),
  balance: z.boolean(),
  /** Where the base style starts; each breakpoint lists its label and where it starts, narrower ones after. */
  minWidth: z.number(),
  breakpoints: z.array(
    z.object({
      label: z.enum(BREAKPOINT_LABELS).nullable(),
      minWidth: z.number(),
      fontSize: z.string(),
      letterSpacing: z.string(),
      lineHeight: z.string(),
      paragraphSpacing: z.number(),
    }),
  ),
});

const StoredFontSchema = z.object({
  family: z.string(),
  weight: z.number().int().nullable(),
  style: z.enum(FONT_STYLES).nullable(),
});

/** A style whose font Framer stored differently from the request, e.g. 400 for a weight the project lacks. */
export const FontFallbackSchema = z.object({
  path: z.string(),
  requested: StoredFontSchema,
  stored: StoredFontSchema,
});

export const TextStyleUpsertOutputSchema = StyleUpsertOutputSchema.extend({
  /** Styles whose font Framer substituted without an error: upload the missing weight, or pick one that exists. */
  fontFallbacks: z.array(FontFallbackSchema),
});
