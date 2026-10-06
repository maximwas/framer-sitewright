import * as z from "zod";
import { LINK_DECORATION_STYLES } from "../constants/link-styles.ts";
import { TEXT_DECORATIONS } from "../constants/text-styles.ts";
import { ColorInputSchema } from "./text-styles.ts";

const LengthSchema = z.string().regex(/^(auto|-?\d+(\.\d+)?(px|em))$/, "Use auto, px or em, e.g. 2px or 0.1em");

const BoxSchema = z.string().regex(/^\d+(\.\d+)?px( \d+(\.\d+)?px){0,3}$/, "Use one to four px values, e.g. 4px 8px");

const LinkColorSchema = ColorInputSchema.nullable().exactOptional();

/** What one state of a link style sets; null removes a value, a field left out stays as it is. */
const LINK_STATE_SHAPE = {
  color: LinkColorSchema.describe(
    '{ token: "Text/Muted" } binds a color token (var(--token-<id>)); { value: "#111111" } sets a raw color.',
  ),
  decoration: z.enum(TEXT_DECORATIONS).nullable().exactOptional(),
  decorationColor: LinkColorSchema,
  decorationStyle: z.enum(LINK_DECORATION_STYLES).nullable().exactOptional(),
  decorationThickness: LengthSchema.nullable().exactOptional(),
  decorationOffset: LengthSchema.nullable().exactOptional().describe("Gap between the text and its underline."),
  backgroundColor: LinkColorSchema.describe("A highlight behind the link text."),
  backgroundRadius: BoxSchema.nullable().exactOptional(),
  backgroundPadding: BoxSchema.nullable().exactOptional(),
};

export const LinkStateInputSchema = z.strictObject(LINK_STATE_SHAPE);

export const LinkStyleInputSchema = z.strictObject({
  path: z.string().min(1).describe('Style path with "/" folders, e.g. "Links/Nav".'),
  ...LINK_STATE_SHAPE,
  hover: LinkStateInputSchema.exactOptional().describe("The link under the pointer."),
  current: LinkStateInputSchema.exactOptional().describe(
    "A link to the page being viewed: the active item of a menu on a site of several pages.",
  ),
  transition: z
    .null()
    .exactOptional()
    .describe(
      "null removes the tween a style may have. Framer animates link styles only with tween easing and refuses " +
        "springs, so Sitewright sets no transition: link colors change at once.",
    ),
});

const LinkColorOutputSchema = z.object({
  token: z.string().nullable(),
  value: z.string(),
});

/** One state of a link style: only the values it sets. */
const LINK_STATE_OUTPUT_SHAPE = {
  color: LinkColorOutputSchema.exactOptional(),
  decoration: z.string().exactOptional(),
  decorationColor: LinkColorOutputSchema.exactOptional(),
  decorationStyle: z.string().exactOptional(),
  decorationThickness: z.string().exactOptional(),
  decorationOffset: z.string().exactOptional(),
  backgroundColor: LinkColorOutputSchema.exactOptional(),
  backgroundRadius: z.string().exactOptional(),
  backgroundPadding: z.string().exactOptional(),
};

export const LinkStateOutputSchema = z.object(LINK_STATE_OUTPUT_SHAPE);

export const LinkStyleOutputSchema = z.object({
  id: z.string(),
  path: z.string(),
  ...LINK_STATE_OUTPUT_SHAPE,
  hover: LinkStateOutputSchema,
  current: LinkStateOutputSchema,
  /** A tween the style animates with, set in the editor or by an earlier write; null: colors change at once. */
  transition: z.string().nullable(),
});
