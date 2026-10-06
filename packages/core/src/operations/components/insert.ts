import * as z from "zod";
import { OperationError } from "../../errors.ts";
import { errorMessage } from "../../utils/errors.ts";
import { isPlainObject } from "../../utils/guards.ts";
import { defineOperation } from "../define.ts";

/**
 * Inserts a component by its module URL: a free Marketplace component (marketplace_browse gives its moduleUrl), one of
 * Framer's own (Video, YouTube…), or any URL copied from the Insert menu. The DSL cannot: it takes only the ids of the
 * project's components ("does not exist" for a URL).
 */
export const componentInsert = defineOperation({
  name: "components.insert",
  effect: "write",
  idempotent: false,
  permissions: ["addComponentInstance", "setParent"],
  input: z.strictObject({
    url: z
      .string()
      .url()
      .describe("The component's module URL, e.g. https://framer.com/m/Carousel-TC0BVf.js@NX0Ibe5BZmuZM0cYmZOE."),
    parentId: z
      .string()
      .min(1)
      .exactOptional()
      .describe("Layer to put the instance into. Without it Framer puts it into the layer selected in the editor."),
    index: z.number().int().min(0).exactOptional().describe("Position among parentId's children; last by default."),
  }),
  output: z.object({
    nodeId: z.string(),
    name: z.string().nullable(),
  }),
  async run({ runtime, history }, { url, parentId, index }) {
    const { port } = runtime;
    let node: unknown;

    try {
      node = await port.addComponentInstance({ url });
    } catch (error) {
      throw new OperationError(
        "WRITE_FAILED",
        `Framer did not insert the component: ${errorMessage(error)}`,
        "Check the URL: a paid Marketplace component has none until it is bought; copy it from its page or the Insert menu.",
      );
    }

    const nodeId = isPlainObject(node) && typeof node.id === "string" ? node.id : null;

    if (nodeId === null) {
      throw new OperationError("WRITE_FAILED", "Framer inserted the component but did not say which layer it is.");
    }

    if (parentId !== undefined) {
      await port.setParent(nodeId, parentId, index);
    }

    history?.markIncomplete("Undo does not remove an inserted component instance: delete it with design_apply.");

    return {
      nodeId,
      name: isPlainObject(node) && typeof node.name === "string" ? node.name : null,
    };
  },
  describe(_input, { nodeId, name }) {
    return {
      subject: name,
      nodes: [
        {
          id: nodeId,
          name: name ?? "Component",
        },
      ],
    };
  },
});
