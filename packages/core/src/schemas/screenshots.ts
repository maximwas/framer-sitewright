import * as z from "zod";

/**
 * readProject's answer to a "screenshot" query of a URL (06.10.2026): `{ type, url, image_url, viewport?, theme }`, the
 * image a full-page JPEG on Framer's CDN; or `{ type, url, error }` when Framer could not load the page.
 */
export const UrlScreenshotAnswerSchema = z.looseObject({
  results: z.array(
    z.looseObject({
      image_url: z.string().optional(),
      error: z.string().optional(),
    }),
  ),
});
