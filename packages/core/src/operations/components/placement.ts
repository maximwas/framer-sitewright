import { FLOW_LAYOUTS, FLOW_PLACEMENT, FREE_PLACEMENT, PAGE_LOOKUP_DEPTH } from "../../constants/components.ts";
import type { HistoryRecorder } from "../../history/recorder.ts";
import { nodeRecord } from "../../plugin-nodes/node-record.ts";
import type { FramerRuntime } from "../../types/framer.ts";
import type { FramerPort } from "../../types/framer-port.ts";
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

/**
 * Journals layers an operation inserted as created, so undo removes them. `parentId` is where they go (null: where
 * Framer put them); the DSL reverts them on the web page found up from there, the home page when there is none.
 */
export async function recordInserted(
  runtime: FramerRuntime,
  history: HistoryRecorder | undefined,
  inserted: {
    readonly id: string;
    readonly type: string;
    readonly name: string | null;
    readonly parentId: string | null;
    readonly index: number | null;
  },
): Promise<void> {
  if (history === undefined) {
    return;
  }

  history.record({
    kind: "node",
    id: inserted.id,
    type: inserted.type,
    name: inserted.name,
    pagePath: await pagePathOf(runtime.port, inserted.parentId ?? inserted.id),
    change: "created",
    before: null,
    after: {
      parentId: inserted.parentId,
      index: inserted.index,
      attributes: {},
      nodes: [],
      overrides: {},
    },
  });
}

/** The path of the web page a layer is on; "/" for a design page, a component, or when the parents cannot be read. */
async function pagePathOf(port: FramerPort, nodeId: string): Promise<string> {
  try {
    const pages = await port.getNodesWithType("WebPageNode");
    let id: string | null = nodeId;

    for (let depth = 0; id !== null && depth < PAGE_LOOKUP_DEPTH; depth += 1) {
      const page = pages.find((candidate) => candidate.id === id);

      if (page !== undefined) {
        return page.path ?? "/";
      }

      const parent = nodeRecord(await port.getParent(id));

      id = parent === null ? null : String(parent.id);
    }
  } catch {
    // The plugin may not know an alpha id yet: the home page is the likeliest.
  }

  return "/";
}
