import { PAGE_CLIMB_MAX, RECT_FILL_MAX, UNLAID_RECT } from "../../constants/nodes.ts";
import { OperationError } from "../../errors.ts";
import { readPluginTree } from "../../plugin-nodes/read.ts";
import type { SerializedNode } from "../../types/dsl.ts";
import type { FramerRuntime } from "../../types/framer.ts";
import type { FramerPort } from "../../types/framer-port.ts";
import { isPlainObject } from "../../utils/guards.ts";
import { withBorderSides } from "./border-sides.ts";

/** The id of the web page at `pagePath`. */
export async function pageRootId(runtime: FramerRuntime, pagePath: string): Promise<string> {
  const page = (await runtime.port.getNodesWithType("WebPageNode")).find((candidate) => candidate.path === pagePath);

  if (page === undefined) {
    throw new OperationError(
      "NOT_FOUND",
      `No web page with path "${pagePath}".`,
      "Call project_overview to list pages.",
    );
  }

  return page.id;
}

/** The path of the web page a node is on, climbing its parents; null for a node on no web page (a component). */
export async function pagePathOf(port: FramerPort, nodeId: string): Promise<string | null> {
  const pages = new Map(
    (await port.getNodesWithType("WebPageNode")).flatMap(({ id, path }) =>
      path === null ? [] : [[id, path] as const],
    ),
  );
  let current = nodeId;

  for (let step = 0; step < PAGE_CLIMB_MAX; step++) {
    const path = pages.get(current);

    if (path !== undefined) {
      return path;
    }

    const parent = await port.getParent(current).catch(() => null);

    if (!isPlainObject(parent) || typeof parent.id !== "string") {
      return null;
    }

    current = parent.id;
  }

  return null;
}

/**
 * Fills the $rect serialize() left out (it gives one only on the home page) from getRect, for the first RECT_FILL_MAX
 * nodes of the tree; a node getRect has no box for stays without.
 */
export async function withRects(port: FramerPort, tree: SerializedNode): Promise<SerializedNode> {
  const getRect = port.getRect?.bind(port);

  if (getRect === undefined) {
    return tree;
  }

  const lacking: Record<string, unknown>[] = [];
  const walk = (node: SerializedNode) => {
    if (lacking.length < RECT_FILL_MAX && node.$rect === undefined && !node.id.startsWith("v:")) {
      lacking.push(node as Record<string, unknown>);
    }

    for (const child of node.children ?? []) {
      walk(child as SerializedNode);
    }
  };

  walk(tree);
  await Promise.all(
    lacking.map(async (node) => {
      const rect = await getRect(String(node.id)).catch(() => null);
      const unlaid =
        rect !== null &&
        rect.x === UNLAID_RECT.x &&
        rect.y === UNLAID_RECT.y &&
        rect.width === UNLAID_RECT.width &&
        rect.height === UNLAID_RECT.height;

      if (rect !== null && !unlaid) {
        node.$rect = {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
        };
      }
    }),
  );

  return tree;
}

/**
 * A node and `depth` levels of children in serialize()'s shape. Without framer.agent (no Server API key) the Plugin API
 * reads it: the same shape, fewer attributes.
 */
export async function readNodeTree(
  runtime: FramerRuntime,
  id: string,
  depth: number,
  pagePath: string,
  attributes?: readonly string[],
): Promise<SerializedNode | null> {
  if (runtime.agent === null) {
    return filterAttributes(
      await readPluginTree(runtime.port, id, depth, () => pageRootId(runtime, pagePath).catch(() => null)),
      attributes,
    );
  }

  const node = await runtime.agent.serialize(
    {
      id,
      depth,
      ...(attributes === undefined ? {} : { attributeFilter: [...attributes] }),
    },
    { pagePath },
  );

  return withBorderSides(runtime.port, (node ?? null) as SerializedNode | null);
}

/** The tree with only the attributes asked for, as serialize()'s attributeFilter gives it; all of them without a filter. */
function filterAttributes(node: SerializedNode | null, names: readonly string[] | undefined): SerializedNode | null {
  if (node === null || names === undefined) {
    return node;
  }

  const attributes = Object.fromEntries(Object.entries(node.attributes ?? {}).filter(([name]) => names.includes(name)));
  const children = (node.children ?? []).map((child) => filterAttributes(child as SerializedNode, names));

  return {
    ...node,
    attributes,
    ...(node.children === undefined ? {} : { children }),
  };
}
