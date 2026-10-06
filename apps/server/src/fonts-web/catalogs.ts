import { errorMessage, OperationError } from "@sitewright/core";
import {
  FONT_CATALOG_TTL_MS,
  FONT_LICENSES,
  FONTSHARE_CSS_URL,
  FONTSHARE_FONTS_URL,
  FONTSHARE_LICENSES,
  FONTSHARE_RANK_STEP,
  GOOGLE_FONTS_METADATA_URL,
  GOOGLE_VARIANT,
} from "../constants/fonts-web.ts";
import type { CatalogFont, FontCategory, WebFontFile } from "../types/fonts-web.ts";

/** Each catalog with when it was fetched; refetched after FONT_CATALOG_TTL_MS. */
const loaded = new Map<string, { readonly at: number; readonly fonts: Promise<CatalogFont[]> }>();

export function googleFonts(fetchText: (url: string) => Promise<string> = getText): Promise<CatalogFont[]> {
  return cachedCatalog(GOOGLE_FONTS_METADATA_URL, async () =>
    parseGoogleFonts(await fetchText(GOOGLE_FONTS_METADATA_URL)),
  );
}

export function fontshareFonts(fetchText: (url: string) => Promise<string> = getText): Promise<CatalogFont[]> {
  return cachedCatalog(FONTSHARE_FONTS_URL, async () => parseFontshare(await fetchText(FONTSHARE_FONTS_URL)));
}

/** The woff2 files of a Fontshare family's weights, from its CSS API. */
export async function fontshareFiles(
  slug: string,
  weights: readonly number[],
  fetchText: (url: string) => Promise<string> = getText,
): Promise<WebFontFile[]> {
  const query = `${FONTSHARE_CSS_URL}?f[]=${encodeURIComponent(slug)}@${[...weights, ...weights.map((weight) => weight + 1)].join(",")}&display=swap`;

  return parseFontFaces(await fetchText(query));
}

/** Google Fonts' metadata: its families, with "Sans Serif" and the rest mapped to the search categories. */
export function parseGoogleFonts(body: string): CatalogFont[] {
  const json: unknown = JSON.parse(body.slice(body.indexOf("{")));
  const list = isPlainObject(json) && Array.isArray(json["familyMetadataList"]) ? json["familyMetadataList"] : [];

  return list.flatMap((entry: unknown) => {
    // Noto families are script coverage, and brand families (Google Sans) are Google's own, not for other sites.
    if (
      !isPlainObject(entry) ||
      typeof entry["family"] !== "string" ||
      entry["isNoto"] === true ||
      entry["isBrandFont"] === true
    ) {
      return [];
    }

    const variants = isPlainObject(entry["fonts"]) ? Object.keys(entry["fonts"]) : [];
    const parsed = variants.flatMap((key) => {
      const match = GOOGLE_VARIANT.exec(key);

      return match?.[1] === undefined
        ? []
        : [
            {
              weight: Number(match[1]),
              italic: match[2] === "i",
            },
          ];
    });
    const family = entry["family"];

    return [
      {
        family,
        source: "google" as const,
        category: googleCategory(String(entry["category"] ?? "")),
        weights: [...new Set(parsed.map(({ weight }) => weight))].sort((a, b) => a - b),
        italic: parsed.some(({ italic }) => italic),
        variable: Array.isArray(entry["axes"]) && entry["axes"].length > 0,
        license: FONT_LICENSES.ofl,
        specimen: `https://fonts.google.com/specimen/${family.replaceAll(" ", "+")}`,
        popularity: numberOr(entry["popularity"], Number.MAX_SAFE_INTEGER),
        trending: numberOr(entry["trending"], Number.MAX_SAFE_INTEGER),
        added: String(entry["dateAdded"] ?? ""),
        slug: null,
      },
    ];
  });
}

/** Fontshare's catalog: free families from Indian Type Foundry and friends. */
export function parseFontshare(body: string): CatalogFont[] {
  const json: unknown = JSON.parse(body);
  const list = (isPlainObject(json) && Array.isArray(json["fonts"]) ? json["fonts"] : []).filter(isPlainObject);
  // Fontshare gives view counts, not ranks: a family's place in them, each place worth FONTSHARE_RANK_STEP of Google's.
  const placeBy = (key: string) => {
    const order = [...list].sort((a, b) => numberOr(b[key], 0) - numberOr(a[key], 0));

    return (entry: Record<string, unknown>) => (order.indexOf(entry) + 1) * FONTSHARE_RANK_STEP;
  };
  const popularity = placeBy("views");
  const trending = placeBy("views_recent");

  return list.flatMap((entry: Record<string, unknown>, index: number) => {
    if (typeof entry["name"] !== "string" || typeof entry["slug"] !== "string") {
      return [];
    }

    const styles = Array.isArray(entry["styles"]) ? entry["styles"].filter(isPlainObject) : [];
    const weights = styles.flatMap((style) => {
      const weight = isPlainObject(style["weight"]) ? Number(style["weight"]["weight"]) : Number.NaN;

      return Number.isInteger(weight) && weight >= 100 && weight <= 900 ? [weight] : [];
    });
    const license = FONTSHARE_LICENSES[String(entry["license_type"])] ?? "itf-ffl";

    return [
      {
        family: entry["name"],
        source: "fontshare" as const,
        category: fontshareCategory(String(entry["category"] ?? "")),
        weights: [...new Set(weights)].sort((a, b) => a - b),
        italic: styles.some((style) => style["is_italic"] === true),
        variable: styles.some((style) => style["is_variable"] === true),
        license: FONT_LICENSES[license],
        specimen: `https://www.fontshare.com/fonts/${entry["slug"]}`,
        popularity: popularity(entry),
        trending: trending(entry),
        added: String(entry["inserted_at"] ?? "").slice(0, 10) || String(index),
        slug: entry["slug"],
      },
    ];
  });
}

/** The woff2 sources of a stylesheet's @font-face rules, with their weight and style. */
export function parseFontFaces(css: string): WebFontFile[] {
  return [...css.matchAll(/@font-face\s*{([^}]*)}/g)].flatMap(([, body = ""]) => {
    const url = /url\('?([^')]+\.woff2)'?\)/.exec(body)?.[1];
    const weight = Number(/font-weight:\s*(\d{3})/.exec(body)?.[1]);

    return url === undefined || !Number.isInteger(weight)
      ? []
      : [
          {
            weight,
            italic: /font-style:\s*italic/.test(body),
            url: url.startsWith("//") ? `https:${url}` : url,
          },
        ];
  });
}

function googleCategory(category: string): FontCategory {
  switch (category) {
    case "Serif":
      return "serif";
    case "Display":
      return "display";
    case "Handwriting":
      return "handwriting";
    case "Monospace":
      return "mono";
    default:
      return "sans";
  }
}

function fontshareCategory(category: string): FontCategory {
  const first = category.split(",")[0]?.trim().toLowerCase() ?? "";

  if (first === "serif" && /slab/i.test(category)) {
    return "slab";
  }

  if (first === "handwritten" || first === "script") {
    return "handwriting";
  }

  return (["sans", "serif", "display", "slab"] as const).find((name) => name === first) ?? "sans";
}

function cachedCatalog(url: string, load: () => Promise<CatalogFont[]>): Promise<CatalogFont[]> {
  const hit = loaded.get(url);

  if (hit !== undefined && Date.now() - hit.at < FONT_CATALOG_TTL_MS) {
    return hit.fonts;
  }

  const fonts = load();

  loaded.set(url, {
    at: Date.now(),
    fonts,
  });
  fonts.catch(() => loaded.delete(url));

  return fonts;
}

async function getText(url: string): Promise<string> {
  let response: Response;

  try {
    response = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 (Macintosh) Sitewright" } });
  } catch (error) {
    throw new OperationError(
      "NOT_FOUND",
      `Could not reach ${new URL(url).host}: ${errorMessage(error)}`,
      "Check the internet connection and try again.",
    );
  }

  if (!response.ok) {
    throw new OperationError(
      "NOT_FOUND",
      `${new URL(url).host} answered ${response.status}.`,
      "Try again later, or search Framer's library with fonts_search.",
    );
  }

  return response.text();
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
