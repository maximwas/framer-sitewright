import * as z from "zod";
import { OperationError } from "../../errors.ts";
import { linkStyleKind, withStyleHistory } from "../../history/style-history.ts";
import { StyleDeleteOutputSchema } from "../../schemas/styles.ts";
import { deleteStyles, selectStyles } from "../../styles/delete-styles.ts";
import { readLinkStyles } from "../../styles/link-styles.ts";
import { defineOperation } from "../define.ts";

export const linkStylesDelete = defineOperation({
  name: "linkStyles.delete",
  effect: "destructive",
  idempotent: true,
  permissions: [],
  // Link styles exist only in the DSL: the Plugin API can neither see nor remove them.
  needsAgent: true,
  input: z.strictObject({
    paths: z.array(z.string().min(1)).max(100).default([]).describe("Style paths; every style at a path goes."),
    folders: z
      .array(z.string().min(1))
      .max(20)
      .default([])
      .describe('Folders to empty, e.g. "Links": every style inside goes, and the folder with them.'),
  }),
  output: StyleDeleteOutputSchema,
  async run({ runtime, history }, { paths, folders }) {
    if (paths.length === 0 && folders.length === 0) {
      throw new OperationError("INVALID_INPUT", "Nothing to delete.", "Pass paths, folders or both.");
    }

    const styles = await readLinkStyles(runtime);
    // The DSL deletes them; a link style has no Plugin API handle to remove.
    const removable = styles.map((style) => ({
      ...style,
      remove: () =>
        Promise.reject(new OperationError("UNSUPPORTED_TRANSPORT", "Link styles are deleted through the DSL only.")),
    }));
    const selection = selectStyles(removable, paths, folders);

    return withStyleHistory(
      {
        history,
        runtime,
        kind: linkStyleKind,
        before: new Map(),
        paths: [],
        targets: selection.found.map(({ style }) => style),
      },
      () =>
        deleteStyles(runtime, {
          ...selection,
          via: "dsl",
          listTool: "link_styles_list",
        }),
    );
  },
});
