import * as z from "zod";
import { LinkStyleOutputSchema } from "../../schemas/link-styles.ts";
import { isInFolder, normalizeAssetPath } from "../../styles/asset-path.ts";
import { readLinkStyles, toLinkStyleOutput } from "../../styles/link-styles.ts";
import { countOf } from "../../utils/text.ts";
import { defineOperation } from "../define.ts";

export const linkStylesList = defineOperation({
  name: "linkStyles.list",
  effect: "read",
  idempotent: true,
  permissions: [],
  // Link styles exist only in the DSL: the Plugin API cannot see them.
  needsAgent: true,
  input: z.strictObject({
    prefix: z.string().min(1).exactOptional().describe('Only styles inside this folder, e.g. "Links".'),
  }),
  output: z.object({ styles: z.array(LinkStyleOutputSchema) }),
  async run({ runtime }, { prefix }) {
    const folder = prefix === undefined ? undefined : normalizeAssetPath(prefix);
    const [styles, tokens] = await Promise.all([readLinkStyles(runtime), runtime.port.getColorStyles()]);

    return {
      styles: styles
        .filter((style) => folder === undefined || isInFolder(style.path, folder))
        .map((style) => toLinkStyleOutput(style, tokens)),
    };
  },
  describe({ prefix }, { styles }) {
    return {
      subject: prefix ?? null,
      summary: countOf(styles.length, "link style"),
    };
  },
});
