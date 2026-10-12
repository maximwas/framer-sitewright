import * as z from "zod";
import { NODES_LOCK_MAX } from "../../constants/nodes.ts";
import { lockStateOf, nodeLockStep } from "../../utils/node-lock.ts";
import { countOf } from "../../utils/text.ts";
import { defineOperation } from "../define.ts";

/**
 * Locks or unlocks layers in the editor, so they cannot be selected or moved by accident (a grain, a grid, a
 * background video). The DSL takes `locked="true"` and ignores it (seen 12.10.2026), so this goes through the Plugin
 * API's setAttributes, with a key or without one; undo unlocks only the layers it locked.
 */
export const nodesLock = defineOperation({
  name: "nodes.lock",
  effect: "write",
  idempotent: true,
  permissions: ["Node.setAttributes"],
  input: z.strictObject({
    nodeIds: z
      .array(z.string().min(1))
      .min(1)
      .max(NODES_LOCK_MAX)
      .describe("The layers to lock or unlock, by id (from nodes_read, nodes_find, nodes_query or selection_get)."),
    locked: z.boolean().default(true).describe("true locks the layers, false unlocks them."),
  }),
  output: z.object({
    locked: z.boolean(),
    /** The layers whose lock changed, named by layer name or type. */
    changed: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
      }),
    ),
    /** Layers that already were as asked. */
    unchanged: z.array(z.string()),
    /** Ids with no layer, or with a node that takes no lock (a page). */
    missing: z.array(z.string()),
  }),
  async run({ runtime, history }, { nodeIds, locked }) {
    const changed: { id: string; name: string }[] = [];
    const unchanged: string[] = [];
    const missing: string[] = [];

    for (const id of new Set(nodeIds)) {
      const before = lockStateOf(await runtime.port.getNode(id).catch(() => null));

      if (before === null) {
        missing.push(id);
      } else if (before.locked === locked) {
        unchanged.push(id);
      } else {
        await runtime.port.setAttributes(id, { locked });
        history?.record(
          nodeLockStep(id, before, {
            ...before,
            locked,
          }),
        );
        changed.push({
          id,
          name: before.path,
        });
      }
    }

    return {
      locked,
      changed,
      unchanged,
      missing,
    };
  },
  describe({ locked }, { changed }) {
    return {
      subject: locked ? "Locked" : "Unlocked",
      summary: countOf(changed.length, "layer"),
      nodes: changed,
    };
  },
});
