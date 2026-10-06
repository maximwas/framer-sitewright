import * as z from "zod";
import { USAGE_LAYER_TYPES } from "../../constants/styles-usage.ts";
import { joinCommands, setNode } from "../../dsl/commands.ts";
import { OperationError } from "../../errors.ts";
import { requireAgent } from "../../framer/runtime.ts";
import { serializedList } from "../../history/dsl/serialized.ts";
import type { ColorStyleData } from "../../types/framer-port.ts";
import { countOf } from "../../utils/text.ts";
import { tokenSwaps } from "../../utils/token-swap.ts";
import { defineOperation } from "../define.ts";
import { designApply } from "../design/apply.ts";
import { usageScopes } from "../styles/usage.ts";

const TokenSchema = z.object({
  id: z.string(),
  path: z.string(),
});

function findToken(tokens: readonly ColorStyleData[], wanted: string): ColorStyleData {
  const name = wanted.replace(/^\//, "");
  const token = tokens.find(({ id, path }) => id === wanted || path.replace(/^\//, "") === name);

  if (token === undefined) {
    throw new OperationError("NOT_FOUND", `No color token "${wanted}".`, "List the tokens with color_tokens_list.");
  }

  return token;
}

export const colorTokensSwap = defineOperation({
  name: "colorTokens.swap",
  effect: "write",
  idempotent: true,
  permissions: [],
  // The layers and the values that name a token come from framer.agent.
  needsAgent: true,
  input: z.strictObject({
    from: z.string().min(1).describe('The token to replace, by path ("Brand/Blue") or id.'),
    to: z.string().min(1).describe("The token to use instead, by path or id."),
    pagePath: z.string().startsWith("/").exactOptional().describe("One web page; omit for the whole site."),
    dryRun: z.boolean().default(false).describe("List what would change without changing it."),
  }),
  output: z.object({
    from: TokenSchema,
    to: TokenSchema,
    changed: z.array(
      z.object({
        id: z.string(),
        scope: z.string(),
        attributes: z.array(z.string()),
      }),
    ),
    /** Texts whose runs name the old token: rewrite them with design_apply xml. */
    insideText: z.array(z.string()),
    /** Text styles whose color is the old token: change them with text_styles_upsert. */
    textStyles: z.array(z.string()),
    applied: z.boolean(),
    failed: z.array(z.string()),
  }),
  async run(context, { from, to, pagePath, dryRun }) {
    const { runtime } = context;
    const agent = requireAgent(runtime);
    const tokens = await runtime.port.getColorStyles();
    const [old, next] = [findToken(tokens, from), findToken(tokens, to)];
    const changed: { id: string; scope: string; attributes: string[] }[] = [];
    const insideText: string[] = [];
    const failed: string[] = [];

    for (const scope of await usageScopes(runtime, agent, pagePath)) {
      const layers = serializedList(
        await agent.getDescendantsOfTypes(
          {
            id: scope.id,
            types: USAGE_LAYER_TYPES,
          },
          scope.pagePath === undefined ? {} : { pagePath: scope.pagePath },
        ),
      );
      const swaps = tokenSwaps(layers, old.id, next.id);

      changed.push(
        ...swaps.changes.map(({ id, attributes }) => ({
          id,
          scope: scope.label,
          attributes: Object.keys(attributes),
        })),
      );
      insideText.push(...swaps.insideText);

      if (dryRun || swaps.changes.length === 0) {
        continue;
      }

      const result = await designApply.run(context, {
        dsl: joinCommands(swaps.changes.map(({ id, attributes }) => setNode(id, attributes))),
        pagePath: scope.pagePath ?? "/",
      });

      if (!result.ok) {
        failed.push(`${scope.label}: ${result.message}`);
      }
    }

    const styles = await runtime.port.getTextStyles();

    return {
      from: {
        id: old.id,
        path: old.path,
      },
      to: {
        id: next.id,
        path: next.path,
      },
      changed,
      insideText,
      textStyles: styles
        .filter(({ color }) => typeof color === "object" && color.id === old.id)
        .map(({ path }) => path),
      applied: !dryRun && failed.length === 0,
      failed,
    };
  },
  refused(output) {
    return output.failed.length === 0 ? null : output.failed.join("; ");
  },
  describe({ dryRun }, { from, to, changed }) {
    return {
      subject: `${from.path} → ${to.path}`,
      summary: `${countOf(changed.length, "layer")}${dryRun ? " (preview)" : ""}`,
    };
  },
});
