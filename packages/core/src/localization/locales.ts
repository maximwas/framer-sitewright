import { OperationError } from "../errors.ts";
import type { FramerPort, LocaleData } from "../types/framer-port.ts";

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
      "The user adds locales in the Framer editor (Localization).",
    );
  }

  return found;
}
