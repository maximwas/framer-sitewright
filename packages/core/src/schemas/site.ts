import * as z from "zod";

export const FoundLayerSchema = z.object({
  id: z.string(),
  /** The page path it is on. */
  page: z.string(),
  type: z.string(),
  name: z.string().nullable(),
  /** A text layer's text, cut short. */
  text: z.string().nullable(),
});

export const TextChangeSchema = z.object({
  id: z.string(),
  page: z.string(),
  before: z.string(),
  after: z.string(),
});

export const RedirectSchema = z.object({
  from: z.string(),
  /** Another path or a URL; null sends to the home page. */
  to: z.string().nullable(),
  /** Also for every locale's version of the path. */
  allLocales: z.boolean(),
});

export const PublishedSchema = z
  .object({
    url: z.string(),
    publishedAt: z.string(),
    optimization: z.string(),
  })
  .nullable();
