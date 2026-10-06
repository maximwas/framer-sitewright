import { SiteFindingSchema } from "@sitewright/core";
import * as z from "zod";
import { LIVE_PAGES_DEFAULT, LIVE_PAGES_MAX } from "../constants/live-check.ts";

export const LiveCheckInputSchema = z.strictObject({
  url: z
    .string()
    .regex(/^https?:\/\/[^\s/]+/, "An http(s) URL.")
    .exactOptional()
    .describe(
      "A published site to check, e.g. https://example.framer.app/ (any public site; its own sitemap is read). Omit for the connected project's site: production, else staging.",
    ),
  limit: z
    .number()
    .int()
    .min(1)
    .max(LIVE_PAGES_MAX)
    .default(LIVE_PAGES_DEFAULT)
    .describe("Most pages to fetch: every top-level page first, then CMS pages taken evenly from each collection."),
});

/** One fetched page: what it answered and what it weighs. */
export const LivePageSchema = z.object({
  path: z.string(),
  /** The HTTP status; null when the request failed (a timeout, no connection). */
  status: z.number().int().nullable(),
  htmlBytes: z.number().int(),
  /** Distinct images the HTML loads (the same file at another size counts once). */
  images: z.number().int(),
  title: z.string().nullable(),
});

export const LiveCheckOutputSchema = z.object({
  site: z.string(),
  /** When the connected project was last published; null for a URL given in the input. */
  publishedAt: z.string().nullable(),
  pages: z.array(LivePageSchema),
  findings: z.array(SiteFindingSchema),
  summary: z.string(),
  note: z.string().nullable(),
});
