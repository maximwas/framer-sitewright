import * as z from "zod";
import { TextStyleOutputSchema } from "../../schemas/text-styles.ts";
import { isInFolder, normalizeAssetPath } from "../../styles/asset-path.ts";
import { countOf } from "../../utils/text.ts";
import { defineOperation } from "../define.ts";
import { toTextStyleOutput } from "./output.ts";

export const textStylesList = defineOperation({
  name: "textStyles.list",
  effect: "read",
  idempotent: true,
  permissions: [],
  input: z.strictObject({ prefix: z.string().min(1).exactOptional() }),
  output: z.object({ styles: z.array(TextStyleOutputSchema) }),
  async run({ runtime }, { prefix }) {
    const folder = prefix === undefined ? undefined : normalizeAssetPath(prefix);
    const styles = (await runtime.port.getTextStyles())
      .map(toTextStyleOutput)
      .filter((style) => folder === undefined || isInFolder(style.path, folder));

    return { styles };
  },
  describe({ prefix }, { styles }) {
    return {
      subject: prefix ?? null,
      summary: countOf(styles.length, "text style"),
    };
  },
});
