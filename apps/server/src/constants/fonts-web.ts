/** Google Fonts' family metadata (all families, categories, weights, popularity); its body starts after `)]}'`. */
export const GOOGLE_FONTS_METADATA_URL = "https://fonts.google.com/metadata/fonts";

/** Fontshare's catalog (Indian Type Foundry's free fonts) and its CSS API for the font files. */
export const FONTSHARE_FONTS_URL = "https://api.fontshare.com/v2/fonts?limit=500";
export const FONTSHARE_CSS_URL = "https://api.fontshare.com/v2/css";

export const FONT_SOURCES = ["google", "fontshare"] as const;

/** The categories fonts are searched by, whatever each catalog calls them. */
export const FONT_CATEGORIES = ["sans", "serif", "display", "slab", "mono", "handwriting"] as const;

/** How long a fetched catalog is kept: catalogs change weekly at most. */
export const FONT_CATALOG_TTL_MS = 12 * 60 * 60 * 1000;

/** What each license allows, in the words a person choosing a font for a client site or a sold template needs. */
export const FONT_LICENSES = {
  ofl: "SIL Open Font License: free for any use, commercial sites and sold templates included.",
  "itf-ffl":
    "ITF Free Font License v2.0 (17 Aug 2026): self-hosting only on the licensee's own sites; the files may not be edited (no subsetting or converting), passed to clients or contractors, or offered in a template. For a client's site or a sold template use the family from Framer's built-in Fontshare library (fonts_search) instead of uploading files, or have the client download its own copy.",
  apache: "Apache License 2.0: free for any use, commercial sites and sold templates included.",
  ufl: "Ubuntu Font License: free for any use, commercial sites included.",
} as const;

/** Fontshare's license codes. */
export const FONTSHARE_LICENSES: Readonly<Record<string, keyof typeof FONT_LICENSES>> = {
  itf_ffl: "itf-ffl",
  sil_ofl: "ofl",
};

/** A Google Fonts variant key ("400", "700i") as a weight and whether it is italic. */
export const GOOGLE_VARIANT = /^(\d{3})(i?)$/;

/** One place in Fontshare's views is worth this many places in Google Fonts' ranks (it lists 100 families, not 1700). */
export const FONTSHARE_RANK_STEP = 15;
