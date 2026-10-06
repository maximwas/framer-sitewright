import * as z from "zod";
import { NODE_TYPE_LABELS } from "../../constants/history.ts";
import {
  NODE_FORMATS,
  NODES_READ_BULK_CONCURRENCY,
  NODES_READ_MAX_CHARS,
  NODES_READ_MAX_IDS,
} from "../../constants/nodes.ts";
import { OperationError } from "../../errors.ts";
import { parseSerializedNode } from "../../history/dsl/serialized.ts";
import type { FramerRuntime } from "../../types/framer.ts";
import type { XmlChild, XmlElementNode } from "../../types/xml.ts";
import { mapInOrder } from "../../utils/async.ts";
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
    nodeIds: z
      .array(z.string().min(1))
      .min(1)
      .max(NODES_READ_MAX_IDS)
      .exactOptional()
      .describe(
        "Several nodes in one call instead of nodeId: their XML one after another; ids not found go to missing.",
      ),
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
    missing: z.array(z.string()).exactOptional(),
  }),
  async run({ runtime }, { nodeId, nodeIds, pagePath, depth, attributes, format }) {
    if (nodeIds !== undefined) {
      return readMany(runtime, nodeIds, {
        pagePath,
        depth,
        attributes,
        format,
      });
    }

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

    assertReadable(chars);

    return {
      pagePath,
      ...(parsed === null ? { node } : { xml: text }),
      chars,
    };
  },
  describe({ nodeId, pagePath, depth }, { xml }) {
    const root = xml === undefined ? undefined : parseXml(xml).find(isElement);
    const id = root?.props.id ?? nodeId;
    // An unnamed layer is called by its type: the journal shows names, never ids.
    const name =
      root?.props.name ??
      (nodeId === undefined ? `Page ${pagePath}` : (NODE_TYPE_LABELS[root?.type ?? ""] ?? root?.type ?? "Layer"));

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

interface ReadOptions {
  readonly pagePath: string;
  readonly depth: number;
  readonly attributes: readonly string[] | undefined;
  readonly format: (typeof NODE_FORMATS)[number];
}

/** Several nodes in one call: XML one after another (or a JSON array), and the ids Framer has no node for. */
async function readMany(
  runtime: FramerRuntime,
  ids: readonly string[],
  { pagePath, depth, attributes, format }: ReadOptions,
) {
  const nodes = await mapInOrder(ids, NODES_READ_BULK_CONCURRENCY, (id) =>
    readNodeTree(runtime, id, depth, pagePath, attributes).catch(() => null),
  );
  const found = nodes.flatMap((node) => (node === null || node === undefined ? [] : [node]));
  const missing = ids.filter((_, index) => nodes[index] === null || nodes[index] === undefined);
  const text =
    format === "xml"
      ? found
          .flatMap((node) => {
            const parsed = parseSerializedNode(node);

            return parsed === null ? [] : [nodeToXml(parsed)];
          })
          .join("\n")
      : JSON.stringify(found);

  assertReadable(text.length);

  return {
    pagePath,
    ...(format === "xml" ? { xml: text } : { node: found }),
    chars: text.length,
    ...(missing.length > 0 ? { missing } : {}),
  };
}

function assertReadable(chars: number): void {
  if (chars > NODES_READ_MAX_CHARS) {
    throw new OperationError(
      "RESULT_TOO_LARGE",
      `Serialized node is ${chars} characters (limit ${NODES_READ_MAX_CHARS}).`,
      "Lower depth, read a child node, or pass an attributes filter.",
    );
  }
}

function isElement(child: XmlChild): child is XmlElementNode {
  return child.kind === "element";
}

function countElements(element: XmlElementNode): number {
  return 1 + element.children.filter(isElement).reduce((sum, child) => sum + countElements(child), 0);
}
