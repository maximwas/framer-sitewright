import * as z from "zod";
import { NODE_FORMATS, NODES_READ_MAX_CHARS } from "../../constants/nodes.ts";
import { OperationError } from "../../errors.ts";
import { parseSerializedNode } from "../../history/dsl/serialized.ts";
import { readPluginTree } from "../../plugin-nodes/read.ts";
import type { SerializedNode } from "../../types/dsl.ts";
import type { FramerRuntime } from "../../types/framer.ts";
import type { XmlChild, XmlElementNode } from "../../types/xml.ts";
import { countOf } from "../../utils/text.ts";
import { nodeToXml } from "../../xml/node-to-xml.ts";
import { parseXml } from "../../xml/parse-xml.ts";
import { defineOperation } from "../define.ts";

async function pageRootId(runtime: FramerRuntime, pagePath: string): Promise<string> {
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

export const nodesRead = defineOperation({
  name: "nodes.read",
  effect: "read",
  idempotent: true,
  permissions: [],
  needsAgent: true,
  input: z.strictObject({
    nodeId: z.string().min(1).exactOptional().describe("Node id. Omit to read the page root of pagePath."),
    pagePath: z.string().startsWith("/").default("/").describe('Page path, e.g. "/" or "/about".'),
    depth: z.number().int().min(0).max(8).default(2).describe("How many child levels to include."),
    attributes: z
      .array(z.string().min(1))
      .max(50)
      .exactOptional()
      .describe('Only these attributes, e.g. ["fill", "layout", "$rect"]. [] returns structure only.'),
    format: z
      .enum(NODE_FORMATS)
      .default("xml")
      .describe("xml: the tree as elements (compact, writable back with design_apply); json: raw serialize()."),
  }),
  output: z.object({
    pagePath: z.string(),
    xml: z.string().exactOptional(),
    node: z.unknown().exactOptional(),
    chars: z.number().int(),
  }),
  async run({ runtime }, { nodeId, pagePath, depth, attributes, format }) {
    const id = nodeId ?? (await pageRootId(runtime, pagePath));
    // Without framer.agent (no Server API key) the Plugin API reads the tree: the same shape, fewer attributes.
    const node =
      runtime.agent === null
        ? filterAttributes(await readPluginTree(runtime.port, id, depth), attributes)
        : await runtime.agent.serialize(
            {
              id,
              depth,
              ...(attributes === undefined ? {} : { attributeFilter: attributes }),
            },
            { pagePath },
          );

    if (node === null || node === undefined) {
      throw new OperationError(
        "NOT_FOUND",
        `Node "${id}" was not found on page ${pagePath}.`,
        "Read the page root first to get current ids.",
      );
    }

    const parsed = format === "xml" ? parseSerializedNode(node) : null;
    const text = parsed === null ? JSON.stringify(node) : nodeToXml(parsed);
    const chars = text.length;

    if (chars > NODES_READ_MAX_CHARS) {
      throw new OperationError(
        "RESULT_TOO_LARGE",
        `Serialized node is ${chars} characters (limit ${NODES_READ_MAX_CHARS}).`,
        "Lower depth, read a child node, or pass an attributes filter.",
      );
    }

    return {
      pagePath,
      ...(parsed === null ? { node } : { xml: text }),
      chars,
    };
  },
  describe({ nodeId, pagePath, depth }, { xml }) {
    const root = xml === undefined ? undefined : parseXml(xml).find(isElement);
    const id = root?.props.id ?? nodeId;
    const name = root?.props.name ?? (nodeId === undefined ? `Page ${pagePath}` : nodeId);

    return {
      subject: `${name}, depth ${depth}`,
      summary: root === undefined ? null : countOf(countElements(root), "node"),
      nodes:
        id === undefined
          ? []
          : [
              {
                id,
                name,
              },
            ],
    };
  },
});

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

function isElement(child: XmlChild): child is XmlElementNode {
  return child.kind === "element";
}

function countElements(element: XmlElementNode): number {
  return 1 + element.children.filter(isElement).reduce((sum, child) => sum + countElements(child), 0);
}
