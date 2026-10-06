import * as z from "zod";
import {
  FLOW_LAYOUTS,
  FLOW_PLACEMENT,
  FREE_PLACEMENT,
  LAYOUT_NOT_MATCHED_NOTE,
  SECTION_INSERT_HINT,
  SECTION_UNDO_NOTE,
} from "../../constants/components.ts";
import { OperationError } from "../../errors.ts";
import { nodeRecord } from "../../plugin-nodes/node-record.ts";
import type { FramerRuntime } from "../../types/framer.ts";
import type { FramerPort } from "../../types/framer-port.ts";
import type { PluginNodeRecord } from "../../types/plugin-nodes.ts";
import { errorMessage } from "../../utils/errors.ts";
import { defineOperation } from "../define.ts";
import { placeLayer } from "./placement.ts";

/**
 * Inserts a component designed in Framer (a section from the Insert menu or the Marketplace) as editable layers, not
 * as an instance. Framer takes no parent for it: the plugin drops it at the editor's selection, the Server API on the
 * home page's canvas at absolute coordinates (06.10.2026). So it always moves into parentId and takes a place there.
 */
export const sectionInsert = defineOperation({
  name: "components.insertSection",
  effect: "write",
  idempotent: false,
  permissions: ["addDetachedComponentLayers", "setParent", "Node.setAttributes"],
  input: z.strictObject({
    url: z
      .string()
      .url()
      .describe(
        "The component's module URL (framer.com/m/…): copied from the Insert menu or a Marketplace page, or moduleUrl from marketplace_browse.",
      ),
    parentId: z
      .string()
      .min(1)
      .describe("Layer to put the layers into, e.g. the page's main stack or its primary (Desktop) breakpoint."),
    index: z.number().int().min(0).exactOptional().describe("Position among parentId's children; last by default."),
    layout: z
      .boolean()
      .default(false)
      .describe(
        "Insert it as a layout block whose variants follow the page's breakpoints. Framer matches them only when it inserts into a breakpoint of the target page; the answer's note says when it did not.",
      ),
    attributes: z
      .record(z.string(), z.unknown())
      .exactOptional()
      .describe(
        "Passed to Framer as the component instance's attributes before it detaches the layers. Name, size, opacity and visibility do not reach the layers: set those with design_apply afterwards.",
      ),
  }),
  output: z.object({
    /** The root frame of the inserted layers. */
    nodeId: z.string(),
    name: z.string().nullable(),
    /** What did not go as asked, e.g. variants not matched to the breakpoints; null when all did. */
    note: z.string().nullable(),
  }),
  async run({ runtime, history }, { url, parentId, index, layout, attributes }) {
    const { port } = runtime;
    let inserted: unknown;

    try {
      inserted = await port.addDetachedComponentLayers({
        url,
        layout,
        ...(attributes === undefined ? {} : { attributes }),
      });
    } catch (error) {
      throw new OperationError(
        "WRITE_FAILED",
        `Framer did not insert the layers: ${errorMessage(error)}`,
        SECTION_INSERT_HINT,
        { cause: error },
      );
    }

    const root = nodeRecord(inserted);

    if (root === null) {
      throw new OperationError("WRITE_FAILED", "Framer inserted the layers but did not say which layer they are.");
    }

    const nodeId = String(root.id);

    history?.markIncomplete(SECTION_UNDO_NOTE);

    // Where Framer put it decides the breakpoints, so this is read before the move.
    const matched = layout ? await sameBreakpointPage(port, nodeId, parentId) : true;

    await port.setParent(nodeId, parentId, index);

    const notes = [matched ? null : LAYOUT_NOT_MATCHED_NOTE, await placeInParent(runtime, nodeId, parentId)].filter(
      (note) => note !== null,
    );

    return {
      nodeId,
      name: typeof root.name === "string" ? root.name : null,
      note: notes.length === 0 ? null : notes.join(" "),
    };
  },
  describe(_input, { nodeId, name }) {
    return {
      subject: name,
      nodes: [
        {
          id: nodeId,
          name: name ?? "Section",
        },
      ],
    };
  },
});

/** Whether Framer put the layers into a breakpoint of the page parentId is on: only then are the variants matched. */
async function sameBreakpointPage(port: FramerPort, nodeId: string, parentId: string): Promise<boolean> {
  const [landed, target] = await Promise.all([
    port.getParent(nodeId).then((parent) => breakpointPage(port, nodeRecord(parent))),
    port.getNode(parentId).then((parent) => breakpointPage(port, nodeRecord(parent))),
  ]);

  return landed !== null && landed === target;
}

/** The page whose breakpoint holds `node` (itself included), or null outside every breakpoint. */
async function breakpointPage(port: FramerPort, node: PluginNodeRecord | null): Promise<string | null> {
  let current = node;

  while (current !== null && !current.isBreakpoint) {
    current = nodeRecord(await port.getParent(String(current.id)));
  }

  if (current === null) {
    return null;
  }

  const page = nodeRecord(await port.getParent(String(current.id)));

  return page === null ? null : String(page.id);
}

/**
 * A move often keeps the canvas coordinates Framer dropped the layers at (absolute, left 8040px), so in a stack or grid
 * they go into the flow and elsewhere into the top left corner. Returns what did not work, or null.
 */
async function placeInParent(runtime: FramerRuntime, nodeId: string, parentId: string): Promise<string | null> {
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
