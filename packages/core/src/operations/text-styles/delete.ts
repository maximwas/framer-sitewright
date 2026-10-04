import * as z from "zod";
import { TEXT_STYLE_NODE_TYPE } from "../../constants/text-styles.ts";
import { OperationError } from "../../errors.ts";
import { textStyleKind, withStyleHistory } from "../../history/style-history.ts";
import { ViaSchema } from "../../schemas/operations.ts";
import { StyleDeleteOutputSchema } from "../../schemas/styles.ts";
import { clearBreakpoints } from "../../styles/clear-breakpoints.ts";
import { deleteStyles, selectStyles } from "../../styles/delete-styles.ts";
import { defineOperation } from "../define.ts";
import { resolveVia } from "../via.ts";

export const textStylesDelete = defineOperation({
  name: "textStyles.delete",
  effect: "destructive",
  idempotent: true,
  permissions: ["TextStyle.remove"],
  needsAgent: ({ via }) => via === "dsl",
  input: z.strictObject({
    paths: z.array(z.string().min(1)).max(100).default([]).describe("Style paths; every style at a path goes."),
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
    const selection = selectStyles(await runtime.port.getTextStyles(), paths, folders);

    return withStyleHistory(
      {
        history,
        runtime,
        kind: textStyleKind,
        before: new Map(),
        paths: [],
        targets: selection.found.map(({ style }) => style),
      },
      () =>
        deleteStyles(runtime, {
          ...selection,
          via,
          listTool: "text_styles_list",
          beforeRemove: clearBreakpoints,
          slotNodeType: TEXT_STYLE_NODE_TYPE,
        }),
    );
  },
});
