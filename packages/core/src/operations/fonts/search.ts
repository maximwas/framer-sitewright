import * as z from "zod";
import { FONT_STYLES } from "../../constants/fonts.ts";
import { countOf } from "../../utils/text.ts";
import { defineOperation } from "../define.ts";
import { exactFontFamily, fontFamilies, uploadedFontFamilies } from "./font-catalog.ts";

function rank(family: string, needle: string): number {
  const name = family.toLowerCase();

  if (name === needle) {
    return 0;
  }

  return name.startsWith(needle) ? 1 : 2;
}

export const fontsSearch = defineOperation({
  name: "fonts.search",
  effect: "read",
  idempotent: true,
  permissions: [],
  input: z.strictObject({
    query: z.string().min(1).describe('Part of a font family name, e.g. "inter" or "serif display".'),
    limit: z.number().int().min(1).max(50).default(10),
  }),
  output: z.object({
    fonts: z.array(
      z.object({
        family: z.string(),
        /** library: Framer's font library; project: uploaded to this project, variants as its text styles use them. */
        source: z.enum(["library", "project"]),
        variants: z.array(
          z.object({
            weight: z.number().int().nullable(),
            style: z.enum(FONT_STYLES).nullable(),
          }),
        ),
      }),
    ),
    totalMatches: z.number().int(),
  }),
  async run({ runtime }, { query, limit }) {
    // A whole family name needs no library scan: that scan is what takes over 30 s through the plugin.
    const exact = await exactFontFamily(runtime.port, query);

    if (exact !== null) {
      return {
        fonts: [
          {
            family: exact.family,
            source: "library" as const,
            variants: exact.variants,
          },
        ],
        totalMatches: 1,
      };
    }

    const needle = query.trim().toLowerCase();
    const library = await fontFamilies(runtime);
    const uploaded = uploadedFontFamilies(library, await runtime.port.getTextStyles());
    const matches = [
      ...[...uploaded.entries()].map(([family, variants]) => ({
        family,
        source: "project" as const,
        variants,
      })),
      ...[...library.entries()].map(([family, variants]) => ({
        family,
        source: "library" as const,
        variants,
      })),
    ]
      .filter(({ family }) => family.toLowerCase().includes(needle))
      .sort((a, b) => rank(a.family, needle) - rank(b.family, needle) || a.family.localeCompare(b.family));

    return {
      fonts: matches.slice(0, limit).map(({ family, source, variants }) => ({
        family,
        source,
        variants: [...variants],
      })),
      totalMatches: matches.length,
    };
  },
  describe({ query }, { fonts, totalMatches }) {
    return {
      subject: `“${query}”`,
      summary: `${countOf(totalMatches, "family", "families")}${fonts.length > 0 ? `: ${fonts.map(({ family }) => family).join(", ")}` : ""}`,
    };
  },
});
