import { runPluginApiWrites } from "../../styles/plugin-api-batch.ts";
import { unsentOutcome } from "../../styles/style-refs.ts";
import type { ColorTokenPlan, NormalizedToken, TokenUpdate } from "../../types/color-tokens.ts";
import type { FramerRuntime } from "../../types/framer.ts";
import type { ColorStyleCreate, ColorStyleUpdate } from "../../types/framer-port.ts";
import type { CreatedStyle, PluginApiWrite, StyleWriteOptions, StyleWriteOutcome } from "../../types/styles.ts";

/** createColorStyle for new tokens and setAttributes with the changed channels for the rest. */
export async function writeColorTokensWithPluginApi(
  runtime: FramerRuntime,
  plan: ColorTokenPlan,
  { dryRun }: StyleWriteOptions,
): Promise<StyleWriteOutcome> {
  if (dryRun) {
    return unsentOutcome(plan.creates, "");
  }

  const created: CreatedStyle[] = [];
  const creates = plan.creates.map(
    (token): PluginApiWrite => ({
      action: "create",
      path: token.path,
      run: async () => {
        const style = await runtime.port.createColorStyle(colorCreate(token));

        created.push({
          path: token.path,
          id: style.id,
        });
      },
    }),
  );
  const updates = plan.updates.map(
    (update): PluginApiWrite => ({
      action: "update",
      path: update.path,
      run: () => update.style.setAttributes(colorUpdate(update)),
    }),
  );

  await runPluginApiWrites([...creates, ...updates], "color_tokens_list");

  return {
    created,
    dsl: "",
    diagnostics: null,
  };
}

function colorCreate(token: NormalizedToken): ColorStyleCreate {
  return {
    path: token.path,
    light: token.light,
    ...(token.dark === undefined || token.dark === null ? {} : { dark: token.dark }),
  };
}

function colorUpdate(update: TokenUpdate): ColorStyleUpdate {
  return {
    ...(update.light === undefined ? {} : { light: update.light }),
    ...(update.dark === undefined ? {} : { dark: update.dark }),
  };
}
