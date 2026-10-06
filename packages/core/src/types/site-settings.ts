import type * as z from "zod";
import type {
  LayoutTemplateSchema,
  PageMetadataSchema,
  PageSettingsInputSchema,
  PageSettingsSchema,
  SiteMetadataSchema,
  SiteSettingsInputSchema,
} from "../schemas/site-settings.ts";

export type SiteMetadata = z.infer<typeof SiteMetadataSchema>;

export type PageMetadata = z.infer<typeof PageMetadataSchema>;

export type PageSettings = z.infer<typeof PageSettingsSchema>;

export type LayoutTemplate = z.infer<typeof LayoutTemplateSchema>;

export type SiteSettingsInput = z.output<typeof SiteSettingsInputSchema>;

export type PageSettingsInput = z.output<typeof PageSettingsInputSchema>;

/** What a page node says about itself through the DSL; the Plugin API adds its path and collection. */
export type PageNodeSettings = Pick<PageSettings, "draft" | "metadata" | "layoutTemplate">;

/** The settings the DSL reads in one call: the root's metadata, each page's own settings by id, the layout templates. */
export interface SettingsNodes {
  readonly site: SiteMetadata;
  readonly pages: ReadonlyMap<string, PageNodeSettings>;
  readonly layoutTemplates: readonly LayoutTemplate[];
}
