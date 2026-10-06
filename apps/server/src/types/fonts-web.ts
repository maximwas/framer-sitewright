import type * as z from "zod";
import type { FONT_CATEGORIES, FONT_SOURCES } from "../constants/fonts-web.ts";
import type { FontsDiscoverInputSchema, WebFontFileSchema, WebFontSchema } from "../schemas/fonts-web.ts";

export type FontCategory = (typeof FONT_CATEGORIES)[number];

export type FontSource = (typeof FONT_SOURCES)[number];

export type WebFont = z.infer<typeof WebFontSchema>;

export type WebFontFile = z.infer<typeof WebFontFileSchema>;

/** A family as a catalog lists it, before the Framer library check. */
export interface CatalogFont {
  readonly family: string;
  readonly source: FontSource;
  readonly category: FontCategory;
  readonly weights: readonly number[];
  readonly italic: boolean;
  readonly variable: boolean;
  readonly license: string;
  readonly specimen: string;
  /** Lower is more popular. */
  readonly popularity: number;
  /** Lower is rising faster. */
  readonly trending: number;
  /** When the catalog added it, ISO date. */
  readonly added: string;
  /** Fontshare's slug, for its CSS API. */
  readonly slug: string | null;
}

export type FontsDiscoverInput = z.output<typeof FontsDiscoverInputSchema>;
