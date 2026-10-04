import { OperationError } from "../../errors.ts";
import { readPluginTree } from "../../plugin-nodes/read.ts";
import type { SerializedNode } from "../../types/dsl.ts";
import type { FramerRuntime } from "../../types/framer.ts";

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
    return filterAttributes(await readPluginTree(runtime.port, id, depth), attributes);
  }

  const node = await runtime.agent.serialize(
    {
      id,
      depth,
      ...(attributes === undefined ? {} : { attributeFilter: [...attributes] }),
    },
    { pagePath },
  );

  return (node ?? null) as SerializedNode | null;
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
