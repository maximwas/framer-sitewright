import { addNode, setNode } from "../../dsl/commands.ts";
import { nextTempId } from "../../dsl/temp-ids.ts";
import { applyDslBatch } from "../../styles/dsl-batch.ts";
import type { ColorTokenPlan } from "../../types/color-tokens.ts";
import type { FramerRuntime } from "../../types/framer.ts";
import type { StyleWriteOptions, StyleWriteOutcome } from "../../types/styles.ts";

/** One applyChanges call: `+ColorStyleTokenNode` for new tokens, `SET` with the changed channels for the rest. */
export function writeColorTokensWithDsl(
  runtime: FramerRuntime,
  plan: ColorTokenPlan,
  { dryRun }: StyleWriteOptions,
): Promise<StyleWriteOutcome> {
  const creates = plan.creates.map((token) => ({
    ...token,
    tempId: nextTempId(runtime, "token"),
  }));
  const commands = [
    ...creates.map(({ tempId, path, light, dark }) =>
      addNode("ColorStyleTokenNode", tempId, {
        name: path,
        light,
        dark: dark ?? undefined,
      }),
    ),
    ...plan.updates.map(({ style, light, dark }) =>
      setNode(style.id, {
        light,
        dark,
      }),
    ),
  ];

  return applyDslBatch(
    runtime,
    {
      commands,
      creates,
    },
    dryRun,
  );
}
