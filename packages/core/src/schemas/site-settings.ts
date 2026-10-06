import * as z from "zod";
import { SETTINGS_IMAGE_URL, SETTINGS_VARIABLE_REFERENCE } from "../constants/site-settings.ts";
import { DslIssueSchema } from "./dsl.ts";

/** The site's metadata on the root node: every page inherits it. Null: not set. */
export const SiteMetadataSchema = z.object({
  title: z.string().nullable(),
  description: z.string().nullable(),
  socialImage: z.string().nullable(),
  favicon: z.string().nullable(),
  faviconDark: z.string().nullable(),
  appleTouchIcon: z.string().nullable(),
});

/** A page's own metadata. A null title, description or image inherits the site's. */
export const PageMetadataSchema = z.object({
  title: z.string().nullable(),
  description: z.string().nullable(),
  socialImage: z.string().nullable(),
  /** Hidden from search engines. */
  noIndex: z.boolean(),
  /** Hidden from the site's own search. */
  noIndexSite: z.boolean(),
});

export const PageSettingsSchema = z.object({
  path: z.string(),
  id: z.string(),
  /** A draft page is left out when the site is published. */
  draft: z.boolean(),
  /** A CMS detail page's collection; null for a static page. */
  collectionId: z.string().nullable(),
  /** Null without a Server API key, which the read needs. */
  metadata: PageMetadataSchema.nullable(),
  /** "default" (the home page's template), a layout template's id, or null: none, or not readable without a key. */
  layoutTemplate: z.string().nullable(),
});

export const LayoutTemplateSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
});

const ImageUrlSchema = z
  .string()
  .regex(SETTINGS_IMAGE_URL, "An https image URL: Framer downloads it and keeps a copy.")
  .nullable();

const TextSettingSchema = z.string().min(1).max(1000).nullable();

export const SiteSettingsInputSchema = z
  .strictObject({
    title: TextSettingSchema.exactOptional().describe("The site's title: the default for every page."),
    description: TextSettingSchema.exactOptional().describe("The site's description: the default for every page."),
    socialImage: ImageUrlSchema.exactOptional().describe("The link preview image, 1200×630."),
    favicon: ImageUrlSchema.exactOptional().describe("The browser tab icon, SVG or PNG."),
    faviconDark: ImageUrlSchema.exactOptional().describe("The tab icon for dark browser themes."),
    appleTouchIcon: ImageUrlSchema.exactOptional().describe("The home screen icon on iOS, a 180×180 PNG."),
  })
  .refine((site) => Object.keys(site).length > 0, "Give at least one site setting.");

export const PageSettingsInputSchema = z
  .strictObject({
    path: z.string().startsWith("/").describe('The page, e.g. "/about"; a CMS detail page as "/blog/:slug".'),
    title: TextSettingSchema.exactOptional().describe(
      "The page's title; null inherits the site's. A CMS detail page takes variables: {{Title}}.",
    ),
    description: TextSettingSchema.exactOptional().describe("The page's description; null inherits the site's."),
    socialImage: z
      .union([ImageUrlSchema, z.string().regex(SETTINGS_VARIABLE_REFERENCE)])
      .exactOptional()
      .describe(
        "The page's link preview image; null inherits the site's. A CMS detail page may use var(--variable-<id>).",
      ),
    noIndex: z.boolean().exactOptional().describe("Hide the page from search engines."),
    noIndexSite: z
      .boolean()
      .exactOptional()
      .describe("Hide the page from the site's own search; follows noIndex unless given."),
    layoutTemplate: z
      .string()
      .min(1)
      .nullable()
      .exactOptional()
      .describe(
        '"default" (the home page\'s template), a layout template id from site_settings_get, or null for none.',
      ),
    draft: z.boolean().exactOptional().describe("A draft page is left out when the site is published."),
  })
  .refine((page) => Object.keys(page).length > 1, "Give at least one setting besides the path.");

export const SiteSettingsSetResultSchema = z.object({
  ok: z.boolean(),
  message: z.string(),
  /** What Framer refused; the rest of the batch is applied. */
  errors: z.array(DslIssueSchema),
  /**
   * The site's settings after the call, as Framer keeps them (an image URL becomes Framer's own copy); null when they
   * could not be read back.
   */
  site: SiteMetadataSchema.nullable(),
  /** The pages the call changed, after it; empty when they could not be read back. */
  pages: z.array(PageSettingsSchema),
});
