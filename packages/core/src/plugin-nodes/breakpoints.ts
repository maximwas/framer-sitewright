import { SNAPSHOT_DEPTH } from "../constants/history.ts";
import { PIXEL_WIDTH } from "../constants/text-styles.ts";
import { OperationError } from "../errors.ts";
import { childrenOf, differingAttributes } from "../history/dsl/serialized.ts";
import type { SerializedNode } from "../types/dsl.ts";
import type { CanvasNodeData, FramerPort } from "../types/framer-port.ts";
import type { DslAttributeMap } from "../types/history.ts";
import type { BreakpointPage, BreakpointSpec, PluginDeletion } from "../types/plugin-nodes.ts";
import { nodeRecord } from "./node-record.ts";
import { readPluginTree } from "./read.ts";
import { dslAttributes, snapshotsOf } from "./snapshots.ts";

/** A page's breakpoint frames, as getChildren gives them. */
export async function pageBreakpoints(port: FramerPort, pageId: string): Promise<CanvasNodeData[]> {
  return (await port.getChildren(pageId)).filter((child) => child.isBreakpoint);
}

/** A breakpoint frame's width in px, or null. */
export function breakpointWidthOf(node: CanvasNodeData): number | null {
  const pixels = typeof node.width === "string" ? PIXEL_WIDTH.exec(node.width) : null;

  return pixels === null ? null : Number(pixels[1]);
}

/** Adds a breakpoint to a web page as a replica of `basedOn` (its primary breakpoint); the new frame's id. */
export async function addBreakpoint(
  port: FramerPort,
  pageId: string,
  basedOn: string,
  spec: BreakpointSpec,
): Promise<string> {
  const page = await port.getNode(pageId);

  if (!isBreakpointPage(page)) {
    throw new OperationError(
      "UNSUPPORTED_TRANSPORT",
      `Node ${pageId} is not a web page that this Framer runtime can add breakpoints to.`,
    );
  }

  const created = nodeRecord(
    await page.addBreakpoint(basedOn, {
      name: spec.name,
      width: spec.width,
    }),
  );

  if (created === null) {
    throw new OperationError("WRITE_FAILED", `Framer did not add the ${spec.name} breakpoint.`);
  }

  return String(created.id);
}

/**
 * What undo needs to bring a deleted node back, read before the deletion. A replica breakpoint is one node that says
 * what it replicates, with its values that differ from it, plus the overrides its layers held: Framer recreates the
 * layers with the breakpoint, as the DSL's CREATE_VARIANT does. Any other node is its subtree, plus the overrides the
 * page's other breakpoints held for its nodes, which the deletion takes with it.
 */
export async function deletionSnapshot(
  port: FramerPort,
  tree: SerializedNode,
  parentId: string,
  index: number,
): Promise<PluginDeletion> {
  const source = tree.$isReplica ? tree.$originalId : undefined;

  if (source === undefined) {
    const nodes = snapshotsOf(tree, parentId, index);

    return {
      nodes,
      overrides: await copiesOverrides(port, parentId, nodes),
    };
  }

  const primary = await readPluginTree(port, source, SNAPSHOT_DEPTH);
  const originals = primary === null ? new Map<string, DslAttributeMap>() : attributesById(primary);

  return {
    nodes: [
      {
        id: tree.id,
        type: tree.type,
        name: tree.name ?? null,
        parentId,
        index,
        params: {},
        attributes: differingAttributes(dslAttributes(tree.attributes), originals.get(source) ?? {}),
        replicaOf: source,
        gesture: null,
      },
    ],
    overrides: { [tree.id]: layerOverrides(tree, originals) },
  };
}

/** A replica's layers that differ from the primary nodes they copy, by original id. */
function layerOverrides(
  replica: SerializedNode,
  originals: ReadonlyMap<string, DslAttributeMap>,
): Record<string, DslAttributeMap> {
  const found: Record<string, DslAttributeMap> = {};

  for (const layer of descendantsOf(replica)) {
    const original = layer.$originalId;
    const diff =
      original === undefined ? {} : differingAttributes(dslAttributes(layer.attributes), originals.get(original) ?? {});

    if (original !== undefined && Object.keys(diff).length > 0) {
      found[original] = diff;
    }
  }

  return found;
}

/**
 * The overrides the page's replica breakpoints hold for nodes about to be deleted from the primary one, as replica id
 * → node id → attributes: the copies `<replica id><node id>` go with the node.
 */
async function copiesOverrides(
  port: FramerPort,
  parentId: string,
  nodes: readonly PluginDeletion["nodes"][number][],
): Promise<PluginDeletion["overrides"]> {
  const replicas = await replicaBreakpointsAbove(port, parentId);
  const overrides: PluginDeletion["overrides"] = {};

  for (const replica of replicas) {
    for (const node of nodes) {
      const copy = await readPluginTree(port, `${replica}${node.id}`, 0);
      const diff = copy === null ? {} : differingAttributes(dslAttributes(copy.attributes), node.attributes);

      if (Object.keys(diff).length > 0) {
        overrides[replica] = {
          ...overrides[replica],
          [node.id]: diff,
        };
      }
    }
  }

  return overrides;
}

/** The replica breakpoints of the page whose primary breakpoint holds `nodeId`; none outside a page's primary. */
async function replicaBreakpointsAbove(port: FramerPort, nodeId: string): Promise<string[]> {
  let current = nodeRecord(await port.getNode(nodeId));

  while (current !== null && !current.isBreakpoint) {
    current = nodeRecord(await port.getParent(String(current.id)));
  }

  if (current === null || !current.isPrimaryBreakpoint) {
    return [];
  }

  const page = nodeRecord(await port.getParent(String(current.id)));

  if (page === null) {
    return [];
  }

  return (await pageBreakpoints(port, String(page.id)))
    .filter((breakpoint) => !breakpoint.isPrimaryBreakpoint)
    .map((breakpoint) => breakpoint.id);
}

function attributesById(tree: SerializedNode): Map<string, DslAttributeMap> {
  return new Map([tree, ...descendantsOf(tree)].map((node) => [node.id, dslAttributes(node.attributes)]));
}

function descendantsOf(node: SerializedNode): SerializedNode[] {
  return childrenOf(node).flatMap((child) => [child, ...descendantsOf(child)]);
}

function isBreakpointPage(value: unknown): value is BreakpointPage {
  return (
    typeof value === "object" && value !== null && "addBreakpoint" in value && typeof value.addBreakpoint === "function"
  );
}
