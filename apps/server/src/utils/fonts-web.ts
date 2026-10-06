import type { CatalogFont, FontCategory } from "../types/fonts-web.ts";

export interface FontRanking {
  readonly query?: string | undefined;
  readonly category?: FontCategory | undefined;
  readonly sort: "popular" | "trending" | "new";
}

/** The catalogs' families that match, in the order asked for: the most popular, the fastest rising or the newest. */
export function rankFonts(fonts: readonly CatalogFont[], { query, category, sort }: FontRanking): CatalogFont[] {
  const words = (query ?? "").toLowerCase().split(/\s+/).filter(Boolean);

  return fonts
    .filter(
      (font) =>
        (category === undefined || font.category === category) &&
        words.every((word) => font.family.toLowerCase().includes(word)),
    )
    .sort((a, b) => {
      if (sort === "new") {
        return b.added.localeCompare(a.added);
      }

      return sort === "trending" ? a.trending - b.trending : a.popularity - b.popularity;
    });
}
