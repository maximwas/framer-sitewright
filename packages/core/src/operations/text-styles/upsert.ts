import * as z from "zod";
import { NO_FONTS } from "../../constants/fonts.ts";
import { textStyleKind, withStyleHistory } from "../../history/style-history.ts";
import { ViaSchema } from "../../schemas/operations.ts";
import { TextStyleInputSchema, TextStyleUpsertOutputSchema } from "../../schemas/text-styles.ts";
import { indexByPath } from "../../styles/style-index.ts";
import { describePlan } from "../../styles/style-refs.ts";
import type { FramerRuntime } from "../../types/framer.ts";
import type { FontFallback, TextStyleContext, TextStyleInput, TextStylePlan } from "../../types/text-styles.ts";
import { defineOperation } from "../define.ts";
import { fontFamilies, uploadedFontFamilies } from "../fonts/font-catalog.ts";
import { resolveVia } from "../via.ts";
import { normalizeTextStyles, planTextStyles } from "./plan.ts";
import { writeTextStylesWithDsl } from "./write-dsl.ts";
import { writeTextStylesWithPluginApi } from "./write-plugin-api.ts";

export const textStylesUpsert = defineOperation({
  name: "textStyles.upsert",
  effect: "write",
  idempotent: true,
  permissions: ["createTextStyle", "TextStyle.setAttributes"],
  // "auto" writes through the DSL whenever the project has a key: design_apply does not see a style the Plugin API
  // made until a DSL write touches it.
  needsAgent: ({ via }) => via !== "plugin-api",
  input: z.strictObject({
    styles: z.array(TextStyleInputSchema).min(1).max(100),
    dryRun: z.boolean().default(false).describe("Only return the plan, change nothing."),
    via: ViaSchema,
  }),
  output: TextStyleUpsertOutputSchema,
  async run({ runtime, history }, { styles, dryRun, via: requested }) {
    const via = resolveVia(runtime, requested);
    const requests = normalizeTextStyles(styles);
    const context = await readContext(runtime, requests);
    const plan = planTextStyles(requests, context);
    const write = via === "dsl" ? writeTextStylesWithDsl : writeTextStylesWithPluginApi;
    const outcome = await withStyleHistory(
      {
        history,
        runtime,
        kind: textStyleKind,
        before: context.existing,
        paths: requests.map((style) => style.path),
        dryRun,
      },
      () => write(runtime, plan, { dryRun }),
    );

    return {
      ...describePlan(plan),
      ...outcome,
      dryRun,
      via,
      fontFallbacks: dryRun ? [] : await fontFallbacks(runtime, plan),
    };
  },
});

/**
 * Styles whose font Framer stored differently from the plan. Framer swaps a weight the project lacks for one it has
 * and answers "applied cleanly" (Sofia Pro 300 → 400, seen 01.10.2026), so the styles are read back.
 */
async function fontFallbacks(runtime: FramerRuntime, plan: TextStylePlan): Promise<FontFallback[]> {
  const written = [...plan.creates, ...plan.updates].filter(({ changes }) => changes.font !== undefined);

  if (written.length === 0) {
    return [];
  }

  const stored = await indexByPath(runtime.port.getTextStyles());

  return written.flatMap(({ path, changes }) => {
    const requested = changes.font;
    const font = stored.get(path)?.font;

    if (requested === undefined || font === undefined) {
      return [];
    }

    const same =
      font.family.toLowerCase() === requested.family.toLowerCase() &&
      font.weight === requested.weight &&
      font.style === requested.style;

    return same
      ? []
      : [
          {
            path,
            requested: {
              family: requested.family,
              weight: requested.weight,
              style: requested.style,
            },
            stored: {
              family: font.family,
              weight: font.weight,
              style: font.style,
            },
          },
        ];
  });
}

/** The current styles and tokens, and the ~9.5k-font library only when a style sets a font. */
async function readContext(runtime: FramerRuntime, styles: readonly TextStyleInput[]): Promise<TextStyleContext> {
  const needsFonts = styles.some((style) => style.font !== undefined);
  const [existing, tokens, fonts] = await Promise.all([
    indexByPath(runtime.port.getTextStyles()),
    indexByPath(runtime.port.getColorStyles()),
    needsFonts ? fontFamilies(runtime) : NO_FONTS,
  ]);

  return {
    existing,
    tokens,
    fonts,
    uploadedFonts: needsFonts ? uploadedFontFamilies(fonts, [...existing.values()]) : NO_FONTS,
  };
}
