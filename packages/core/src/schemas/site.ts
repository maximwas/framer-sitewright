import * as z from "zod";
import { TEXT_FORMATTING } from "../constants/nodes.ts";

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
  /** The breakpoint copy whose own text this is; null for the primary breakpoint, which the copies follow. */
  breakpoint: z.string().nullable(),
  before: z.string(),
  after: z.string(),
  /** kept: bold, links and lists stay; partial: a match crosses differently formatted runs; plain: no key, plain text. */
  formatting: z.enum(TEXT_FORMATTING),
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
