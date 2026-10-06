import * as z from "zod";
import { DETACH_BLOCKED_HINT, DETACH_UNDO_NOTE } from "../../constants/components.ts";
import { OperationError } from "../../errors.ts";
import { requireAgent } from "../../framer/runtime.ts";
import { nodeRecord } from "../../plugin-nodes/node-record.ts";
import { placementChanges } from "../../utils/components.ts";
import { errorMessage } from "../../utils/errors.ts";
import { defineOperation } from "../define.ts";
import { readAgentAnswer, refusal } from "./agent-answer.ts";
import { placeLayer } from "./placement.ts";

/** Replaces a component instance with its layers, like Detach in the editor. */
export const componentDetach = defineOperation({
  name: "components.detach",
  // The instance is gone for good: undo does not bring it back.
  effect: "destructive",
  idempotent: false,
  permissions: [],
  needsAgent: true,
  input: z.strictObject({
    nodeId: z
      .string()
      .min(1)
      .describe("The instance of a project component (ComponentInstanceNode) to replace with its layers."),
  }),
  output: z.object({
    /** The frame that took the instance's place: the root of the detached layers. */
    nodeId: z.string(),
    /** The instance it replaced; that id no longer exists. */
    instanceId: z.string(),
    name: z.string().nullable(),
    /** What did not go as asked, e.g. a placement Framer did not take; null when all did. */
    note: z.string().nullable(),
  }),
  async run({ runtime, history }, { nodeId }) {
    const agent = requireAgent(runtime);
    // Its place in the parent, read while it exists: Framer's flatten places the new root as the component's own root.
    const instance = nodeRecord(await runtime.port.getNode(nodeId).catch(() => null));
    const answer = readAgentAnswer(await agent.flattenComponentInstance({ id: nodeId }), "detach");

    if (answer.status !== "success") {
      throw refusal(answer, "Framer did not detach the instance", DETACH_BLOCKED_HINT);
    }

    history?.markIncomplete(DETACH_UNDO_NOTE);

    const replacementId = answer.replacementId ?? null;

    if (replacementId === null) {
      throw new OperationError(
        "WRITE_FAILED",
        "Framer detached the instance but did not say which layer took its place.",
        "Read the instance's former parent with nodes_read.",
      );
    }

    const root = nodeRecord(await runtime.port.getNode(replacementId).catch(() => null));
    const changes = instance === null || root === null ? {} : placementChanges(instance, root);
    let note: string | null = null;

    // Seen 06.10.2026: an instance in a stack came back position absolute, an absolute one relative.
    if (root !== null && Object.keys(changes).length > 0) {
      try {
        note = await placeLayer(runtime, root, changes);
      } catch (error) {
        note = `Framer did not take the instance's placement over (${Object.keys(changes).join(", ")}): ${errorMessage(error)}. Set it with design_apply.`;
      }
    }

    return {
      nodeId: replacementId,
      instanceId: nodeId,
      name: typeof root?.name === "string" ? root.name : null,
      note,
    };
  },
  describe(_input, { nodeId, name }) {
    return {
      subject: name,
      nodes: [
        {
          id: nodeId,
          name: name ?? "Layers",
        },
      ],
    };
  },
});
