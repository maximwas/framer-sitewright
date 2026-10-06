import { FLOW_LAYOUTS, FLOW_PLACEMENT, FREE_PLACEMENT } from "../../constants/components.ts";
import { nodeRecord } from "../../plugin-nodes/node-record.ts";
import type { FramerRuntime } from "../../types/framer.ts";
import type { PluginNodeRecord } from "../../types/plugin-nodes.ts";
import { errorMessage } from "../../utils/errors.ts";

/**
 * Gives a layer the placement attributes it lacks (Plugin API names and values). setAttributes ignores a switch between
 * absolute and relative (Server API, 06.10.2026) while a DSL SET makes it, so `position` goes through framer.agent
 * when there is one, first: pins only hold on a layer already placed that way. Returns what Framer still did not
 * take, or null.
 */
export async function placeLayer(
  runtime: FramerRuntime,
  node: PluginNodeRecord,
  wanted: Readonly<Record<string, unknown>>,
): Promise<string | null> {
  const id = String(node.id);
  const { position, ...pins } = wanted;
  const moves = position !== undefined && node.position !== position;

  if (moves && runtime.agent !== null) {
    await runtime.agent.applyChanges(`SET ${id} position="${String(position)}";`);
  }

  const writes =
    moves && runtime.agent === null
      ? {
          ...pins,
          position,
        }
      : pins;

  if (Object.keys(writes).length > 0) {
    await runtime.port.setAttributes(id, writes);
  }

  if (!moves) {
    return null;
  }

  const placed = nodeRecord(await runtime.port.getNode(id));

  return placed?.position === position
    ? null
    : `Framer kept the layer ${String(placed?.position)}: set position="${String(position)}" on ${id} with design_apply.`;
}

/**
 * A move often keeps the canvas coordinates Framer dropped the layers at (absolute, left 8040px), so in a stack or grid
 * they go into the flow and elsewhere into the top left corner. Returns what did not work, or null.
 */
export async function placeInParent(runtime: FramerRuntime, nodeId: string, parentId: string): Promise<string | null> {
  try {
    const [parent, node] = (await Promise.all([runtime.port.getNode(parentId), runtime.port.getNode(nodeId)])).map(
      nodeRecord,
    );

    if (node === null || node === undefined) {
      return "Framer did not show the layers after the move: read them with nodes_read.";
    }

    return await placeLayer(runtime, node, FLOW_LAYOUTS.includes(parent?.layout) ? FLOW_PLACEMENT : FREE_PLACEMENT);
  } catch (error) {
    return `Framer did not place the layers in their parent: ${errorMessage(error)}. Set their position with design_apply.`;
  }
}
