import * as z from "zod";
import { MARKETPLACE_KINDS, MARKETPLACE_LIMIT, MARKETPLACE_LIMIT_MAX } from "../constants/marketplace.ts";

export const MarketplaceInputSchema = z.strictObject({
  kind: z.enum(MARKETPLACE_KINDS).default("templates"),
  category: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .exactOptional()
    .describe(
      'A category slug, e.g. "agency", "consulting", "saas" (templates) or "carousels", "tickers" (components).',
    ),
  query: z.string().min(2).exactOptional().describe("Keep only items whose name has these words, e.g. testimonial."),
  freeOnly: z.boolean().default(false).describe("Only free items (components that component_insert can insert)."),
  limit: z.number().int().min(1).max(MARKETPLACE_LIMIT_MAX).default(MARKETPLACE_LIMIT),
});

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

export const MarketplaceOutputSchema = z.object({
  source: z.string(),
  items: z.array(MarketplaceItemSchema),
  categories: z.array(z.string()),
});
