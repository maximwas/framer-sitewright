import * as z from "zod";
import { OperationError } from "../../errors.ts";
import { colorStyleKind, withStyleHistory } from "../../history/style-history.ts";
import { ViaSchema } from "../../schemas/operations.ts";
import { StyleDeleteOutputSchema } from "../../schemas/styles.ts";
import { deleteStyles, selectStyles } from "../../styles/delete-styles.ts";
import { defineOperation } from "../define.ts";
import { resolveVia } from "../via.ts";

export const colorTokensDelete = defineOperation({
  name: "colorTokens.delete",
  effect: "destructive",
  idempotent: true,
  permissions: ["ColorStyle.remove"],
  // "auto" writes through the DSL whenever the project has a key: design_apply does not see a style the Plugin API
  // made until a DSL write touches it.
  needsAgent: ({ via }) => via !== "plugin-api",
  input: z.strictObject({
    paths: z.array(z.string().min(1)).max(200).default([]).describe("Style paths; every style at a path goes."),
    folders: z
      .array(z.string().min(1))
      .max(20)
      .default([])
      .describe('Folders to empty, e.g. "mcp-test/live": every style inside goes, and the folder with them.'),
    via: ViaSchema,
  }),
  output: StyleDeleteOutputSchema,
  async run({ runtime, history }, { paths, folders, via: requested }) {
    if (paths.length === 0 && folders.length === 0) {
      throw new OperationError("INVALID_INPUT", "Nothing to delete.", "Pass paths, folders or both.");
    }

    const via = resolveVia(runtime, requested);
    const selection = selectStyles(await runtime.port.getColorStyles(), paths, folders);

    return withStyleHistory(
      {
        history,
        runtime,
        kind: colorStyleKind,
        before: new Map(),
        paths: [],
        targets: selection.found.map(({ style }) => style),
      },
      () =>
        deleteStyles(runtime, {
          ...selection,
          via,
          listTool: "color_tokens_list",
        }),
    );
  },
});
