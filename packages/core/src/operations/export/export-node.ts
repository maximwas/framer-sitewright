import * as z from "zod";
import { EXPORT_DEPTH_DEFAULT, EXPORT_DEPTH_MAX } from "../../constants/nodes.ts";
import { OperationError } from "../../errors.ts";
import { exportHtml, exportReact } from "../../export/export.ts";
import type { ExportContext, ExportTextStyle } from "../../export/types.ts";
import { parseSerializedNode } from "../../history/dsl/serialized.ts";
import type { FramerRuntime } from "../../types/framer.ts";
import { defineOperation } from "../define.ts";
import { pageRootId, readNodeTree } from "../nodes/read-tree.ts";

const EXPORT_FORMATS = ["html", "react"] as const;

/** The project's tokens and text styles, as the exporters name them. */
async function exportContext(runtime: FramerRuntime): Promise<ExportContext> {
  const [tokens, styles] = await Promise.all([runtime.port.getColorStyles(), runtime.port.getTextStyles()]);
  const textStyles = new Map<string, ExportTextStyle>();

  for (const style of styles) {
    for (const key of [style.id, style.path, style.path.replace(/^\//, ""), style.name]) {
      textStyles.set(key, style);
    }
  }

  return {
    tokens: new Map(
      tokens.map(({ id, path, light, dark }) => [
        id,
        {
          name: path,
          light,
          dark,
        },
      ]),
    ),
    textStyles,
  };
}

/** A component name from a layer or page name: PascalCase letters and digits. */
function componentNameOf(name: string): string {
  const words = name
    .replace(/[^A-Za-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
  const joined = words.map((word) => word[0]?.toUpperCase() + word.slice(1)).join("");

  return /^[A-Z]/.test(joined) ? joined : `Section${joined}`;
}

export const exportNode = defineOperation({
  name: "export.node",
  effect: "read",
  idempotent: true,
  permissions: [],
  input: z.strictObject({
    nodeId: z.string().min(1).exactOptional().describe("The layer to export; omit for the page's primary breakpoint."),
    pagePath: z.string().startsWith("/").default("/"),
    format: z.enum(EXPORT_FORMATS).default("html"),
    depth: z.number().int().min(0).max(EXPORT_DEPTH_MAX).default(EXPORT_DEPTH_DEFAULT),
  }),
  output: z.object({
    name: z.string(),
    html: z.string().exactOptional(),
    css: z.string().exactOptional(),
    react: z.string().exactOptional(),
  }),
  async run({ runtime }, { nodeId, pagePath, format, depth }) {
    const id = nodeId ?? (await primaryBreakpointOf(runtime, pagePath));
    const tree = parseSerializedNode(await readNodeTree(runtime, id, depth, pagePath));

    if (tree === null) {
      throw new OperationError("NOT_FOUND", `No layer "${id}" on ${pagePath}.`, "Find it with nodes_find.");
    }

    const context = await exportContext(runtime);
    const name = tree.name ?? (nodeId === undefined ? `Page ${pagePath}` : tree.type);

    if (format === "react") {
      return {
        name,
        react: exportReact(tree, context, componentNameOf(nodeId === undefined ? pageNameOf(pagePath) : name)),
      };
    }

    return {
      name,
      ...exportHtml(tree, context),
    };
  },
  describe({ format }, { name }) {
    return {
      subject: name,
      summary: format === "react" ? "React" : "HTML and CSS",
    };
  },
});

function pageNameOf(pagePath: string): string {
  return pagePath === "/" ? "Home" : pagePath.split("/").filter(Boolean).join(" ");
}

/** A page's primary breakpoint: what a visitor on a desktop sees. */
async function primaryBreakpointOf(runtime: FramerRuntime, pagePath: string): Promise<string> {
  const pageId = await pageRootId(runtime, pagePath);
  const children = await runtime.port.getChildren(pageId);
  const primary = children.find((child) => child.isBreakpoint && child.isPrimaryBreakpoint) ?? children[0];

  if (primary === undefined) {
    throw new OperationError("NOT_FOUND", `Page ${pagePath} has no breakpoint to export.`);
  }

  return primary.id;
}
