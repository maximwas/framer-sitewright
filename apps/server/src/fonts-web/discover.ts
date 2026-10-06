import { fontsInLibrary } from "@sitewright/core";
import type { TransportRouter } from "../transports/router.ts";
import type { FontsDiscoverInput, WebFont } from "../types/fonts-web.ts";
import { rankFonts } from "../utils/fonts-web.ts";
import { fontshareFiles, fontshareFonts, googleFonts } from "./catalogs.ts";

/**
 * Fonts beyond what fonts_search finds: Google Fonts and Fontshare, filtered and ranked, each with its license in plain
 * words and whether Framer's library has it (asked through the connected project; unknown without one). A family the
 * library lacks comes with its woff2 files when asked, for file_upload.
 */
export async function discoverFonts(transports: TransportRouter, input: FontsDiscoverInput) {
  const catalogs = await Promise.all([
    input.source === "fontshare" ? [] : googleFonts(),
    input.source === "google" ? [] : fontshareFonts(),
  ]);
  const matches = rankFonts(catalogs.flat(), input);
  const picked = matches.slice(0, input.limit);
  const library = await transports
    .run(fontsInLibrary, { families: picked.map(({ family }) => family) })
    .then(({ families }) => new Map(families.map(({ family, inLibrary }) => [family, inLibrary])))
    .catch(() => null);
  const fonts: WebFont[] = [];

  for (const font of picked) {
    const inFramer = library?.get(font.family) ?? null;

    fonts.push({
      family: font.family,
      source: font.source,
      category: font.category,
      weights: [...font.weights],
      italic: font.italic,
      variable: font.variable,
      license: font.license,
      specimen: font.specimen,
      inFramer,
      files:
        input.files && inFramer !== true && font.slug !== null ? await fontshareFiles(font.slug, font.weights) : [],
    });
  }

  return {
    fonts,
    totalMatches: matches.length,
  };
}
