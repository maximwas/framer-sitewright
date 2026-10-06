import { FONT_STYLES, FONT_WEIGHTS } from "../../constants/fonts.ts";
import { OperationError } from "../../errors.ts";
import type { FontFamilies, FontVariant } from "../../types/fonts.ts";
import type { FramerRuntime } from "../../types/framer.ts";
import type { FontStyle, FontWeight, FramerPort, TextStyleData } from "../../types/framer-port.ts";
import { cached } from "../../utils/cache.ts";

const catalogs = new WeakMap<FramerRuntime, Promise<FontFamilies>>();

/** The font library, loaded once per runtime: getFonts returns ~9.5k fonts and takes about a second. */
export function fontFamilies(runtime: FramerRuntime): Promise<FontFamilies> {
  return cached(catalogs, runtime, () => loadFontFamilies(runtime.port));
}

async function loadFontFamilies(port: FramerPort): Promise<FontFamilies> {
  const families = new Map<string, FontVariant[]>();

  for (const font of await port.getFonts()) {
    const variants = families.get(font.family) ?? [];

    // Framer lists some variants several times (one per source file): one weight and style is one variant.
    if (!variants.some((variant) => variant.weight === font.weight && variant.style === font.style)) {
      variants.push({
        weight: font.weight,
        style: font.style,
      });
    }

    families.set(font.family, variants);
  }

  for (const variants of families.values()) {
    variants.sort((a, b) => (a.weight ?? 0) - (b.weight ?? 0) || String(a.style).localeCompare(String(b.style)));
  }

  return families;
}

/** The library's spelling of a family, matched case-insensitively, or undefined when it has no such family. */
export function findFontFamily(families: FontFamilies, requested: string): string | undefined {
  const wanted = requested.trim().toLowerCase();

  return [...families.keys()].find((family) => family.toLowerCase() === wanted);
}

/**
 * Families the project's text styles use that the library lacks: fonts uploaded to the project. getFonts() leaves them
 * out, so this is the only place the API shows them; their variants are the ones the styles use.
 */
export function uploadedFontFamilies(library: FontFamilies, styles: readonly TextStyleData[]): FontFamilies {
  const families = new Map<string, FontVariant[]>();

  for (const { font } of styles) {
    if (findFontFamily(library, font.family) !== undefined) {
      continue;
    }

    const variants = families.get(font.family) ?? [];

    if (!variants.some((variant) => variant.weight === font.weight && variant.style === font.style)) {
      variants.push({
        weight: font.weight,
        style: font.style,
      });
    }

    families.set(font.family, variants);
  }

  return families;
}

/** The library's spelling of a family, matched case-insensitively. */
export function resolveFontFamily(families: FontFamilies, requested: string): string {
  const family = findFontFamily(families, requested);

  if (family !== undefined) {
    return family;
  }

  throw new OperationError(
    "FONT_NOT_FOUND",
    `Font family "${requested}" is not available.`,
    "Find the exact family with fonts_search; fonts uploaded to the project show there once a text style uses them.",
  );
}

/** Throws FONT_NOT_FOUND, listing the available variants, when `family` lacks this weight and style. */
export function assertFontVariant(families: FontFamilies, family: string, weight: FontWeight, style: FontStyle): void {
  const variants = families.get(family) ?? [];

  if (variants.some((variant) => variant.weight === weight && variant.style === style)) {
    return;
  }

  const available = variants.map((variant) => `${variant.weight ?? "?"} ${variant.style ?? "?"}`).join(", ");

  throw new OperationError(
    "FONT_NOT_FOUND",
    `"${family}" has no ${weight} ${style} variant.`,
    `Available: ${available}.`,
  );
}

/**
 * A library family by its exact name, one variant at a time through getFont: the whole library (getFonts) takes over
 * 30 s through the plugin. Tries the name as written and in title case ("inter" → "Inter"); null when neither exists.
 */
export async function exactFontFamily(
  port: FramerPort,
  query: string,
): Promise<{ family: string; variants: FontVariant[] } | null> {
  const written = query.trim();
  const titled = written.replace(/\b\w/g, (letter) => letter.toUpperCase());

  for (const name of new Set([written, titled])) {
    const fonts = await Promise.all(
      FONT_WEIGHTS.flatMap((weight) =>
        FONT_STYLES.map((style) =>
          port.getFont(name, {
            weight,
            style,
          }),
        ),
      ),
    );
    const found = fonts.filter((font) => font !== null);
    const first = found[0];

    if (first !== undefined) {
      return {
        family: first.family,
        variants: found
          .map(({ weight, style }) => ({
            weight,
            style,
          }))
          .sort((a, b) => (a.weight ?? 0) - (b.weight ?? 0) || String(a.style).localeCompare(String(b.style))),
      };
    }
  }

  return null;
}
