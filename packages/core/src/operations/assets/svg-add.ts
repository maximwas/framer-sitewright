import * as z from "zod";
import { PRODUCT } from "../../constants/product.ts";
import { OperationError } from "../../errors.ts";
import type { FramerPort } from "../../types/framer-port.ts";
import { errorMessage } from "../../utils/errors.ts";
import { defineOperation } from "../define.ts";

export const svgAdd = defineOperation({
  name: "svg.add",
  effect: "write",
  idempotent: false,
  permissions: ["addSVG", "setParent"],
  input: z.strictObject({
    svg: z.string().min(1).describe("SVG markup with width, height and viewBox."),
    name: z.string().min(1).exactOptional(),
    parentId: z
      .string()
      .min(1)
      .exactOptional()
      .describe("Layer to put the vector into. Without it Framer puts it into the layer selected in the editor."),
    index: z.number().int().min(0).exactOptional().describe("Position among parentId's children; last by default."),
  }),
  output: z.object({
    added: z.boolean(),
    /** The new layers, as the editor selects them after the insert; empty when Framer did not say. */
    nodeIds: z.array(z.string()),
  }),
  async run({ runtime }, { svg, name, parentId, index }) {
    const { port } = runtime;
    const before = await selectedIds(port);

    try {
      await port.addSVG({
        svg,
        ...(name === undefined ? {} : { name }),
      });
    } catch (error) {
      // The Server API cannot optimize SVGs (spike 13, 30.09.2026); the editor can.
      throw new OperationError(
        runtime.transport === "server-api" ? "UNSUPPORTED_TRANSPORT" : "WRITE_FAILED",
        `Framer did not add the SVG: ${errorMessage(error)}`,
        runtime.transport === "server-api"
          ? `Open the ${PRODUCT.title} plugin (framer_connect plugin), or upload it with image_upload svg and use the url as a fill.`
          : undefined,
      );
    }

    // Framer selects what it inserts (seen 01.10.2026): the layers selected now and not before are the new ones.
    const nodeIds = (await selectedIds(port)).filter((id) => !before.includes(id));

    if (parentId !== undefined) {
      const [nodeId] = nodeIds;

      if (nodeId === undefined || nodeIds.length > 1) {
        throw new OperationError(
          "WRITE_FAILED",
          "The SVG was added, but Framer did not say which layer it is, so it stayed where Framer put it.",
          "It is inside the layer selected in the editor: find it with nodes_read and MOVE it with design_apply.",
        );
      }

      await port.setParent(nodeId, parentId, index);
    }

    return {
      added: true,
      nodeIds,
    };
  },
  describe({ name }, { nodeIds }) {
    return {
      subject: name ?? null,
      nodes: nodeIds.map((id) => ({
        id,
        name: name ?? "SVG",
      })),
    };
  },
});

async function selectedIds(port: FramerPort): Promise<string[]> {
  return port.getSelection === undefined ? [] : (await port.getSelection()).map((node) => node.id);
}
