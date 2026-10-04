import * as z from "zod";
import { colorStyleKind, withStyleHistory } from "../../history/style-history.ts";
import { ColorTokenInputSchema } from "../../schemas/color-tokens.ts";
import { ViaSchema } from "../../schemas/operations.ts";
import { StyleUpsertOutputSchema } from "../../schemas/styles.ts";
import { indexByPath } from "../../styles/style-index.ts";
import { describePlan } from "../../styles/style-refs.ts";
import { defineOperation } from "../define.ts";
import { resolveVia } from "../via.ts";
import { normalizeTokens, planColorTokens } from "./plan.ts";
import { writeColorTokensWithDsl } from "./write-dsl.ts";
import { writeColorTokensWithPluginApi } from "./write-plugin-api.ts";

export const colorTokensUpsert = defineOperation({
  name: "colorTokens.upsert",
  effect: "write",
  idempotent: true,
  permissions: ["createColorStyle", "ColorStyle.setAttributes"],
  needsAgent: ({ via }) => via === "dsl",
  input: z.strictObject({
    tokens: z.array(ColorTokenInputSchema).min(1).max(200),
    dryRun: z.boolean().default(false).describe("Only return the plan, change nothing."),
    via: ViaSchema,
  }),
  output: StyleUpsertOutputSchema,
  async run({ runtime, history }, { tokens, dryRun, via: requested }) {
    const via = resolveVia(runtime, requested);
    const normalized = normalizeTokens(tokens);
    const existing = await indexByPath(runtime.port.getColorStyles());
    const plan = planColorTokens(normalized, existing);
    const write = via === "dsl" ? writeColorTokensWithDsl : writeColorTokensWithPluginApi;
    const outcome = await withStyleHistory(
      {
        history,
        runtime,
        kind: colorStyleKind,
        before: existing,
        paths: normalized.map((token) => token.path),
        dryRun,
      },
      () => write(runtime, plan, { dryRun }),
    );

    return {
      ...describePlan(plan),
      ...outcome,
      dryRun,
      via,
    };
  },
});
