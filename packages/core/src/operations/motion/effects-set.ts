import * as z from "zod";
import { LAYER_EFFECTS, MOTION_PRESETS } from "../../constants/motion.ts";
import { presetCommands } from "../../utils/motion.ts";
import { countOf } from "../../utils/text.ts";
import { defineOperation } from "../define.ts";
import { designApply } from "../design/apply.ts";

/**
 * A motion preset on layers in one call: the whole state written, the spring Framer keeps, delays in order. It goes
 * through design_apply, so the journal records it and undo takes it back.
 */
export const effectsSet = defineOperation({
  name: "motion.effectsSet",
  effect: "write",
  idempotent: true,
  permissions: [],
  needsAgent: true,
  input: z.strictObject({
    preset: z.enum(MOTION_PRESETS).describe("The effect to put on the layers."),
    nodeIds: z
      .array(z.string().min(1))
      .min(1)
      .max(50)
      .describe("The layers, in the order they should move (delays grow along this list)."),
    pagePath: z.string().startsWith("/").default("/").describe("The page the layers are on."),
    options: z
      .strictObject({
        delay: z.number().min(0).max(5).exactOptional().describe("Seconds before the first layer starts."),
        stagger: z.number().min(0).max(1).exactOptional().describe("Seconds between layers in order."),
        distance: z.number().min(0).max(400).exactOptional().describe("Pixels of travel."),
        duration: z.number().min(0.1).max(10).exactOptional().describe("Seconds the spring takes."),
        effects: z
          .array(z.enum(LAYER_EFFECTS))
          .min(1)
          .exactOptional()
          .describe('For "remove": which effects to take off; all of them when omitted.'),
      })
      .default({}),
  }),
  output: z.object({
    ok: z.boolean(),
    message: z.string(),
    errors: z.array(
      z.object({
        message: z.string(),
        targets: z.array(z.string()),
      }),
    ),
    warnings: z.array(
      z.object({
        message: z.string(),
        targets: z.array(z.string()),
      }),
    ),
  }),
  async run(context, { preset, nodeIds, pagePath, options }) {
    const result = await designApply.run(context, {
      dsl: presetCommands(preset, nodeIds, options).join("\n"),
      pagePath,
    });

    return {
      ok: result.ok,
      message: result.message,
      errors: [...result.errors],
      warnings: [...result.warnings],
    };
  },
  refused(output) {
    return output.ok ? null : output.message;
  },
  describe({ preset, nodeIds, pagePath }) {
    return {
      subject: `${preset} · ${countOf(nodeIds.length, "layer")}`,
      ...(pagePath === "/" ? {} : { summary: pagePath }),
      nodes: nodeIds.map((id) => ({
        id,
        name: id,
      })),
    };
  },
});
