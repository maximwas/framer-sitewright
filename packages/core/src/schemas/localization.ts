import * as z from "zod";

export const LocaleSummarySchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  slug: z.string(),
  default: z.boolean(),
  /** The locale shown where a translation is missing, by code. */
  fallback: z.string().optional(),
});

export const LocalizedSourceSchema = z.object({
  id: z.string(),
  /** The page, CMS item, component or settings it belongs to. */
  group: z.string(),
  type: z.string(),
  /** The text in the default locale. */
  source: z.string(),
  translation: z.string().nullable(),
  /** Framer's state of the translation: new, needsReview, done or warning; null without one. */
  status: z.string().nullable(),
});
