import * as z from "zod";
import { FONT_CATEGORIES, FONT_SOURCES } from "../constants/fonts-web.ts";

export const WebFontFileSchema = z.object({
  weight: z.number().int(),
  italic: z.boolean(),
  url: z.string(),
});

export const WebFontSchema = z.object({
  family: z.string(),
  source: z.enum(FONT_SOURCES),
  category: z.enum(FONT_CATEGORIES),
  weights: z.array(z.number().int()),
  italic: z.boolean(),
  variable: z.boolean(),
  license: z.string(),
  specimen: z.string(),
  /** Whether Framer's font library has the family, so text styles can use it without an upload; null: no project to ask. */
  inFramer: z.boolean().nullable(),
  /** woff2 files to upload with file_upload when Framer's library lacks the family (only when files was asked for). */
  files: z.array(WebFontFileSchema),
});

export const FontsDiscoverInputSchema = z.strictObject({
  query: z.string().min(2).exactOptional().describe('Words of a family name, e.g. "grotesk" or "satoshi".'),
  category: z.enum(FONT_CATEGORIES).exactOptional(),
  source: z
    .enum([...FONT_SOURCES, "all"])
    .default("all")
    .describe("google: Google Fonts; fontshare: Fontshare (ITF)."),
  sort: z.enum(["popular", "trending", "new"]).default("popular"),
  limit: z.number().int().min(1).max(30).default(12),
  files: z
    .boolean()
    .default(false)
    .describe("Add the woff2 files of families Framer's library lacks, for file_upload."),
});

export const FontsDiscoverOutputSchema = z.object({
  fonts: z.array(WebFontSchema),
  totalMatches: z.number().int(),
});
