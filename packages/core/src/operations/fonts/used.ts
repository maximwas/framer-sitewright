import * as z from "zod";
import { pageLayers } from "../../plugin-nodes/walk.ts";
import type { FontData } from "../../types/framer-port.ts";
import { type FontUse, fontsInUse } from "../../utils/fonts-used.ts";
import { countOf } from "../../utils/text.ts";
import { defineOperation } from "../define.ts";
import { pagesToSearch } from "../nodes/find.ts";

/** The variant fonts a text style keeps beside its regular one. */
const STYLE_VARIANTS = ["font", "boldFont", "italicFont", "boldItalicFont"] as const;

function fontIn(value: unknown): FontUse["font"] | null {
  if (typeof value !== "object" || value === null || typeof (value as FontData).family !== "string") {
    return null;
  }

  const { family, weight, style } = value as FontData;

  return {
    family,
    weight: weight ?? null,
    style: style ?? null,
  };
}

export const fontsUsed = defineOperation({
  name: "fonts.used",
  effect: "read",
  idempotent: true,
  permissions: [],
  input: z.strictObject({
    pagePath: z
      .string()
      .startsWith("/")
      .exactOptional()
      .describe("Look at one page's layers; omit for every web page."),
  }),
  output: z.object({
    fonts: z.array(
      z.object({
        family: z.string(),
        variants: z.array(z.string()),
        textStyles: z.array(z.string()),
        layers: z.number().int(),
      }),
    ),
    /** The walk stopped on a very large page. */
    truncated: z.boolean(),
  }),
  async run({ runtime }, { pagePath }) {
    const uses: FontUse[] = [];
    let complete = true;

    for (const style of await runtime.port.getTextStyles()) {
      for (const key of STYLE_VARIANTS) {
        const font = fontIn((style as unknown as Record<string, unknown>)[key]);

        if (font !== null) {
          uses.push({
            font,
            where: style.name,
          });
        }
      }
    }

    for (const page of await pagesToSearch(runtime.port, pagePath)) {
      const { layers, complete: seenAll } = await pageLayers(runtime.port, page.id);

      complete &&= seenAll;

      for (const { node } of layers) {
        const font = fontIn(node["font"]);

        if (font !== null) {
          uses.push({
            font,
            where: "layer",
          });
        }
      }
    }

    return {
      fonts: fontsInUse(uses),
      truncated: !complete,
    };
  },
  describe(_input, { fonts }) {
    return { summary: countOf(fonts.length, "family", "families") };
  },
});
