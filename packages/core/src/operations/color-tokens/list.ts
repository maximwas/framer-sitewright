import * as z from "zod";
import { ColorTokenSchema } from "../../schemas/color-tokens.ts";
import { isInFolder, normalizeAssetPath } from "../../styles/asset-path.ts";
import type { ColorStyleData } from "../../types/framer-port.ts";
import { countOf } from "../../utils/text.ts";
import { defineOperation } from "../define.ts";

function toColorToken(style: ColorStyleData): z.input<typeof ColorTokenSchema> {
  return {
    id: style.id,
    path: normalizeAssetPath(style.path),
    light: style.light,
    dark: style.dark,
  };
}

export const colorTokensList = defineOperation({
  name: "colorTokens.list",
  effect: "read",
  idempotent: true,
  permissions: [],
  input: z.strictObject({
    prefix: z.string().min(1).exactOptional().describe('Only tokens inside this folder, e.g. "Brand".'),
  }),
  output: z.object({ tokens: z.array(ColorTokenSchema) }),
  async run({ runtime }, { prefix }) {
    const folder = prefix === undefined ? undefined : normalizeAssetPath(prefix);
    const tokens = (await runtime.port.getColorStyles())
      .map(toColorToken)
      .filter((token) => folder === undefined || isInFolder(token.path, folder));

    return { tokens };
  },
  describe({ prefix }, { tokens }) {
    return {
      subject: prefix ?? null,
      summary: countOf(tokens.length, "token"),
    };
  },
});
