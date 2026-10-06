import * as z from "zod";
import { MARKETPLACE_ITEMS_MAX } from "../constants/marketplace.ts";

export const MarketplaceItemSchema = z.object({
  title: z.string(),
  slug: z.string(),
  author: z.string(),
  kind: z.enum(["template", "component"]),
  price: z.string().nullable(),
  pageUrl: z.string(),
  previewUrl: z.string().nullable(),
  thumbnail: z.string().nullable(),
  moduleUrl: z.string().nullable(),
  remixUrl: z.string().nullable(),
});

export const MarketplaceItemInputSchema = z.strictObject({
  links: z
    .array(z.string().min(1))
    .min(1)
    .max(MARKETPLACE_ITEMS_MAX)
    .describe(
      "Marketplace item pages: links the user gave (https://www.framer.com/marketplace/components/<slug>/), or component slugs.",
    ),
  inspect: z
    .boolean()
    .default(false)
    .describe(
      "Insert each free component on a temporary design page, read its controls and defaults, then delete the page.",
    ),
});

export const MarketplaceItemOutputSchema = z.object({
  items: z.array(
    z.object({
      title: z.string(),
      slug: z.string(),
      kind: z.enum(["template", "component"]),
      author: z.string(),
      price: z.string().nullable(),
      pageUrl: z.string(),
      previewUrl: z.string().nullable(),
      moduleUrl: z.string().nullable(),
      remixUrl: z.string().nullable(),
      categories: z.array(z.string()),
      updatedAt: z.string().nullable(),
      publishedAt: z.string().nullable(),
      description: z.string(),
      /** The component's controls with their defaults (inspect), or null when not inspected or not readable. */
      controls: z
        .array(
          z.object({
            name: z.string(),
            value: z.string(),
            /** In words: "list of object { image: responsiveimage, caption: string }", "color", "number"… */
            type: z.string().nullable(),
            write: z.enum(["design_apply", "component_controls_set"]).nullable(),
          }),
        )
        .nullable(),
      note: z.string().nullable(),
    }),
  ),
});
