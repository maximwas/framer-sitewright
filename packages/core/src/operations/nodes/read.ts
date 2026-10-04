import * as z from "zod";
import { NODE_FORMATS, NODES_READ_MAX_CHARS } from "../../constants/nodes.ts";
import { OperationError } from "../../errors.ts";
import { parseSerializedNode } from "../../history/dsl/serialized.ts";
import type { XmlChild, XmlElementNode } from "../../types/xml.ts";
import { countOf } from "../../utils/text.ts";
import { nodeToXml } from "../../xml/node-to-xml.ts";
import { parseXml } from "../../xml/parse-xml.ts";
import { defineOperation } from "../define.ts";
import { pageRootId, readNodeTree } from "./read-tree.ts";

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
    const node = await readNodeTree(runtime, id, depth, pagePath, attributes);

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

function isElement(child: XmlChild): child is XmlElementNode {
  return child.kind === "element";
}

function countElements(element: XmlElementNode): number {
  return 1 + element.children.filter(isElement).reduce((sum, child) => sum + countElements(child), 0);
}
