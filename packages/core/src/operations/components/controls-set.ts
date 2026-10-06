import * as z from "zod";
import { OperationError } from "../../errors.ts";
import { holdsValue, isControlledNode, mergeControls } from "../../utils/controls.ts";
import { defineOperation } from "../define.ts";

/**
 * Sets control values on a component instance through setAttributes, objects included: a code component's object
 * controls (arrows, dots, clipping) are refused by the DSL as "unsupported type object" (seen 01.10.2026).
 */
export const componentControlsSet = defineOperation({
  name: "components.setControls",
  effect: "write",
  idempotent: true,
  permissions: ["Node.setAttributes"],
  input: z.strictObject({
    nodeId: z.string().min(1).describe("The component instance (ComponentInstanceNode) to set."),
    controls: z
      .record(z.string(), z.unknown())
      .describe(
        "Control values by the names the component declares, without $control__ (e.g. arrows, dots). An object control merges with the instance's current value.",
      ),
  }),
  output: z.object({
    nodeId: z.string(),
    /** The instance's layer name, for the activity panel; null when it has none. */
    name: z.string().nullable(),
    /** The controls as the instance holds them after the write. */
    controls: z.record(z.string(), z.unknown()),
    /** Controls written that Framer did not keep: set them with design_apply $control__… or in the editor. */
    notStored: z.array(z.string()),
  }),
  async run({ runtime, history }, { nodeId, controls }) {
    const node = await runtime.port.getNode(nodeId);

    if (!isControlledNode(node)) {
      throw new OperationError(
        "NOT_FOUND",
        `No component instance with controls has the id "${nodeId}".`,
        "Read the page with nodes_read for the instance's id.",
      );
    }

    const next = mergeControls(node.controls, controls);

    const name = node.name ?? null;

    await node.setAttributes({ controls: next });
    history?.markIncomplete(`Controls of ${name ?? nodeId} set: undo does not restore component controls.`);

    // Framer refuses some values without an error (a transition object, an image list): read what it kept.
    const after = await runtime.port.getNode(nodeId).catch(() => null);
    const stored = isControlledNode(after) ? after.controls : next;

    return {
      nodeId,
      name,
      controls: { ...stored },
      notStored: Object.keys(controls).filter((key) => !holdsValue(stored[key], next[key])),
    };
  },
  describe({ controls }, { nodeId, name }) {
    return {
      subject: Object.keys(controls).join(", "),
      nodes: [
        {
          id: nodeId,
          name: name ?? nodeId,
        },
      ],
    };
  },
});
