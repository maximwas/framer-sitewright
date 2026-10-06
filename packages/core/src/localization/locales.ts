import { OperationError } from "../errors.ts";
import type { FramerPort, LocaleData, LocaleLanguageData, LocaleRegionData } from "../types/framer-port.ts";

/**
 * Every locale of the site, the default first. Framer's getLocales lists only the locales added to the project: a
 * project without any gives [] while its default locale is "en-US" (05.10.2026).
 */
export async function siteLocales(port: FramerPort): Promise<{ primary: LocaleData; locales: LocaleData[] }> {
  const [added, primary] = await Promise.all([port.getLocales(), port.getDefaultLocale()]);

  return {
    primary,
    locales: [primary, ...added.filter(({ id }) => id !== primary.id)],
  };
}

/** A locale by id, code, name or URL slug (any case). */
export function findLocale(locales: readonly LocaleData[], query: string): LocaleData {
  const wanted = query.trim().toLowerCase();
  const found =
    locales.find(({ id }) => id === query) ??
    locales.find(
      ({ code, name, slug }) =>
        code.toLowerCase() === wanted || name.toLowerCase() === wanted || (slug !== "" && slug === wanted),
    );

  if (found === undefined) {
    throw new OperationError(
      "NOT_FOUND",
      `No locale "${query}". Locales: ${locales.map(({ code, name }) => `${name} (${code})`).join(", ")}.`,
      "Add one with locale_add (it needs the Server API key), or the user adds it in the Framer editor (Localization).",
    );
  }

  return found;
}

/** A language Framer can add a locale for, by code or English name (any case), or null. */
export function matchLanguage(languages: readonly LocaleLanguageData[], query: string): LocaleLanguageData | null {
  const wanted = query.trim().toLowerCase();

  return languages.find(({ code, name }) => code.toLowerCase() === wanted || name.toLowerCase() === wanted) ?? null;
}

/** A language by code or name; INVALID_INPUT naming the close ones, or every language Framer knows. */
export function findLanguage(languages: readonly LocaleLanguageData[], query: string): LocaleLanguageData {
  const found = matchLanguage(languages, query);

  if (found !== null) {
    return found;
  }

  const wanted = query.trim().toLowerCase();
  const close = languages.filter(
    ({ code, name }) => name.toLowerCase().includes(wanted) || code.toLowerCase().startsWith(wanted),
  );

  throw new OperationError(
    "INVALID_INPUT",
    `Framer has no language "${query}".`,
    close.length > 0 ? `Close ones: ${codesOf(close)}.` : `Languages: ${codesOf(languages)}.`,
  );
}

/** One of a language's regions, by code or name (any case); INVALID_INPUT listing the regions there are. */
export function findRegion(
  regions: readonly LocaleRegionData[],
  query: string,
  language: LocaleLanguageData,
): LocaleRegionData {
  const wanted = query.trim().toLowerCase();
  const found = regions.find(({ code, name }) => code.toLowerCase() === wanted || name.toLowerCase() === wanted);

  if (found === undefined) {
    throw new OperationError(
      "INVALID_INPUT",
      `Framer has no region "${query}" for ${language.name}.`,
      regions.length > 0 ? `Regions: ${codesOf(regions)}.` : `Leave the region out: ${language.name} has none.`,
    );
  }

  return found;
}

/** "nl (Dutch), fr (French)". */
function codesOf(entries: readonly { readonly code: string; readonly name: string }[]): string {
  return entries.map(({ code, name }) => `${code} (${name})`).join(", ");
}
