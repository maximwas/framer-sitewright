import * as z from "zod";
import { PRODUCT } from "../../constants/product.ts";
import { OperationError } from "../../errors.ts";
import { countOf } from "../../utils/text.ts";
import { defineOperation } from "../define.ts";

/**
 * The layers the user selected in the Framer editor. Only the plugin sees the editor, so this runs there; the ids
 * then go to nodes_read and design_apply like any other.
 */
export const selectionGet = defineOperation({
  name: "selection.get",
  effect: "read",
  idempotent: true,
  permissions: [],
  needsPlugin: true,
  input: z.strictObject({}),
  output: z.object({
    nodes: z.array(
      z.object({
        id: z.string(),
        name: z.string().nullable(),
      }),
    ),
  }),
  async run({ runtime }) {
    const { port } = runtime;

    if (port.getSelection === undefined) {
      throw new OperationError(
        "UNSUPPORTED_TRANSPORT",
        `Only the ${PRODUCT.title} plugin sees what is selected in the editor.`,
        `Ask the user to open the ${PRODUCT.title} plugin in this project.`,
      );
    }

    const selected = await port.getSelection();

    return {
      nodes: selected.map((node) => ({
        id: node.id,
        name: node.name ?? null,
      })),
    };
  },
  describe(_input, { nodes }) {
    return {
      summary: `${countOf(nodes.length, "layer")} selected`,
      nodes: nodes.map(({ id, name }) => ({
        id,
        name: name ?? id,
      })),
    };
  },
});
