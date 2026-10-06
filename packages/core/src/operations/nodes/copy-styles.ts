import * as z from "zod";
import { STYLE_CATEGORIES, STYLE_CATEGORY_NAMES, STYLE_TARGETS_MAX } from "../../constants/copy-styles.ts";
import { joinCommands, setNode } from "../../dsl/commands.ts";
import { OperationError } from "../../errors.ts";
import type { DslValue } from "../../types/dsl.ts";
import { countOf } from "../../utils/text.ts";
import { defineOperation } from "../define.ts";
import { designApply } from "../design/apply.ts";
import { readNodeTree } from "./read-tree.ts";

function isDslValue(value: unknown): value is DslValue {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}

export const stylesCopy = defineOperation({
  name: "nodes.copyStyles",
  effect: "write",
  idempotent: true,
  permissions: [],
  input: z.strictObject({
    sourceId: z.string().min(1).describe("The layer whose look to copy."),
    targetIds: z.array(z.string().min(1)).min(1).max(STYLE_TARGETS_MAX).describe("The layers that take it."),
    categories: z
      .array(z.enum(STYLE_CATEGORY_NAMES))
      .min(1)
      .default(["color", "text", "border", "radius", "shadow"])
      .describe("What to copy: color, text, border, radius, shadow, layout, size."),
    pagePath: z.string().startsWith("/").default("/").describe("The page the layers are on."),
  }),
  output: z.object({
    copied: z.record(z.string(), z.string()),
    targets: z.number().int(),
    ok: z.boolean(),
    message: z.string(),
  }),
  async run(context, { sourceId, targetIds, categories, pagePath }) {
    const source = await readNodeTree(context.runtime, sourceId, 0, pagePath);

    if (source === null || source === undefined) {
      throw new OperationError("NOT_FOUND", `No layer "${sourceId}" on ${pagePath}.`, "Find it with nodes_find.");
    }

    const names = new Set(categories.flatMap((category) => STYLE_CATEGORIES[category]));
    const record = source as Record<string, unknown>;
    const attributes = Object.fromEntries(
      [...names].flatMap((name) => {
        const value = record[name];

        return isDslValue(value) ? [[name, value]] : [];
      }),
    );

    if (Object.keys(attributes).length === 0) {
      throw new OperationError("INVALID_INPUT", `The source has none of the ${categories.join(", ")} values set.`);
    }

    const result = await designApply.run(context, {
      dsl: joinCommands(targetIds.map((id) => setNode(id, attributes))),
      pagePath,
    });

    return {
      copied: Object.fromEntries(Object.entries(attributes).map(([name, value]) => [name, String(value)])),
      targets: targetIds.length,
      ok: result.ok,
      message: result.message,
    };
  },
  refused(output) {
    return output.ok ? null : output.message;
  },
  describe({ sourceId }, { targets }) {
    return {
      subject: sourceId,
      summary: `${countOf(targets, "layer")} restyled`,
    };
  },
});
