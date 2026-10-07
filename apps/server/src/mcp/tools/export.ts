import type { McpServer } from "@modelcontextprotocol/server";
import { exportNode, OperationError } from "@sitewright/core";
import * as z from "zod";
import { exportDir, fetchText, fileSlug, htmlDocument, writeExport } from "../../export/files.ts";
import { publishedSite } from "../../live-check/check.ts";
import type { ToolContext } from "../../types/mcp.ts";
import { addTool } from "../add-tool.ts";

const dir = z
  .string()
  .min(1)
  .exactOptional()
  .describe(
    "A folder to write the files to (relative to where Sitewright runs, or absolute); omit to get the text back.",
  );
const pagePath = z.string().startsWith("/").default("/");
const READ = {
  readOnlyHint: true,
  idempotentHint: true,
  openWorldHint: false,
} as const;
const WRITES_FILES = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

/** Component modules and where they come from: a canvas component's insert URL, framer.com/m/…. */
interface ModuleRef {
  readonly name: string;
  readonly url: string;
}

function moduleRefOf(node: unknown): ModuleRef | null {
  const record = typeof node === "object" && node !== null ? (node as Record<string, unknown>) : {};
  const url = record["insertURL"];
  const name = record["componentName"] ?? record["name"];

  return typeof url === "string" && typeof name === "string"
    ? {
        name,
        url,
      }
    : null;
}

export function registerExportTools(server: McpServer, { transports, journal }: ToolContext): void {
  addTool(server, {
    name: "node_export_html",
    title: "Export a layer as HTML",
    description:
      "Writes a layer and everything in it (or a page's desktop breakpoint) as semantic HTML with a stylesheet: one class per layer, stacks and grids as flex and grid, tokens as CSS variables with their dark values, text styles as fonts, headings with their tags. With dir it saves a standalone .html file; without, it returns html and css. A starting point to hand to a developer, not a pixel copy: effects, variants and code components are left out.",
    input: z.strictObject({
      nodeId: z.string().min(1).exactOptional().describe("The layer; omit for the page's desktop breakpoint."),
      pagePath,
      dir,
    }),
    output: z.object({
      name: z.string(),
      html: z.string().nullable(),
      css: z.string().nullable(),
      files: z.array(z.string()),
    }),
    annotations: WRITES_FILES,
    run: (input) =>
      journal.read(
        "node_export_html",
        "Export HTML",
        "plugin-api",
        (result) => ({ subject: result?.name ?? input.nodeId ?? input.pagePath }),
        async () => {
          const exported = await transports.run(exportNode, {
            ...input,
            format: "html",
          });
          const [html, css] = [exported.html ?? "", exported.css ?? ""];

          if (input.dir === undefined) {
            return {
              name: exported.name,
              html,
              css,
              files: [],
            };
          }

          const files = await writeExport(exportDir(input.dir), {
            [`${fileSlug(exported.name)}.html`]: htmlDocument(exported.name, html, css),
          });

          return {
            name: exported.name,
            html: null,
            css: null,
            files,
          };
        },
      ),
  });
  addTool(server, {
    name: "node_export_css",
    title: "Export a layer's CSS",
    description:
      "Returns one layer's own look as CSS (layout, fill, border, radius, size, its text style as a font) with the project's tokens as CSS variables: what a developer needs to match it in code.",
    input: z.strictObject({
      nodeId: z.string().min(1),
      pagePath,
    }),
    output: z.object({
      name: z.string(),
      css: z.string(),
    }),
    annotations: READ,
    run: (input) =>
      journal.read(
        "node_export_css",
        "Export CSS",
        "plugin-api",
        (result) => ({ subject: result?.name ?? input.nodeId }),
        async () => {
          const exported = await transports.run(exportNode, {
            ...input,
            format: "html",
            depth: 0,
          });

          return {
            name: exported.name,
            css: exported.css ?? "",
          };
        },
      ),
  });
  addTool(server, {
    name: "page_export_react",
    title: "Export a page as React",
    description:
      "Writes a page's desktop breakpoint (or one layer) as a React component with inline styles, tokens kept as CSS variables listed at the top. With dir it saves a .tsx file; without, it returns the code. Effects, variants and code components are left out.",
    input: z.strictObject({
      nodeId: z.string().min(1).exactOptional().describe("One layer instead of the whole page."),
      pagePath,
      dir,
    }),
    output: z.object({
      name: z.string(),
      code: z.string().nullable(),
      files: z.array(z.string()),
    }),
    annotations: WRITES_FILES,
    run: (input) =>
      journal.read(
        "page_export_react",
        "Export React",
        "plugin-api",
        (result) => ({ subject: result?.name ?? input.pagePath }),
        async () => {
          const exported = await transports.run(exportNode, {
            ...input,
            format: "react",
          });
          const code = exported.react ?? "";

          if (input.dir === undefined) {
            return {
              name: exported.name,
              code,
              files: [],
            };
          }

          const files = await writeExport(exportDir(input.dir), { [`${fileSlug(exported.name)}.tsx`]: code });

          return {
            name: exported.name,
            code: null,
            files,
          };
        },
      ),
  });
  addTool(server, {
    name: "page_export_html",
    title: "Save a published page's HTML",
    description:
      "Downloads a page of the published site as visitors get it (Framer's own rendered HTML, with its scripts and asset links) and saves it to a folder: a snapshot to archive, diff or hand over. The page must be published; the editor's unpublished changes are not in it.",
    input: z.strictObject({
      pagePath,
      dir,
    }),
    output: z.object({
      url: z.string(),
      bytes: z.number().int(),
      files: z.array(z.string()),
    }),
    annotations: {
      ...WRITES_FILES,
      openWorldHint: true,
    },
    run: (input) =>
      journal.read(
        "page_export_html",
        "Save published page",
        "plugin-api",
        (result) => ({ subject: result?.url ?? input.pagePath }),
        async () => {
          const site = await publishedSite(transports);

          if (site === null) {
            throw new OperationError(
              "NOT_FOUND",
              "The site is not published yet.",
              "Publish it first, or use node_export_html.",
            );
          }

          const url = new URL(input.pagePath, site.url).toString();
          const html = await fetchText(url);
          const files = await writeExport(exportDir(input.dir), {
            [`${fileSlug(input.pagePath === "/" ? "home" : input.pagePath)}.html`]: html,
          });

          return {
            url,
            bytes: Buffer.byteLength(html),
            files,
          };
        },
      ),
  });
  addTool(server, {
    name: "components_export",
    title: "Export component code",
    description:
      "Downloads the compiled ES modules of the project's canvas components (the framer.com/m/… code Framer serves for each) into a folder, one .js per component: they import react, react-dom, framer and framer-motion. Pass names for some; omit for all.",
    input: z.strictObject({
      names: z.array(z.string().min(1)).min(1).max(50).exactOptional(),
      dir,
    }),
    output: z.object({
      files: z.array(z.string()),
      skipped: z.array(z.string()),
    }),
    annotations: {
      ...WRITES_FILES,
      openWorldHint: true,
    },
    run: (input) =>
      journal.read(
        "components_export",
        "Export components",
        "plugin-api",
        (result) => ({ summary: result === null ? null : `${result.files.length} files` }),
        async () => {
          const nodes = await transports.withServerApi((runtime) => runtime.port.getNodesWithType("ComponentNode"));
          const refs = nodes.flatMap((node) => {
            const ref = moduleRefOf(node);

            return ref === null ||
              (input.names !== undefined && !input.names.some((name) => name.toLowerCase() === ref.name.toLowerCase()))
              ? []
              : [ref];
          });
          const contents: Record<string, string> = {};
          const skipped: string[] = [];

          for (const { name, url } of refs) {
            try {
              contents[`${fileSlug(name)}.js`] = await fetchText(url);
            } catch {
              skipped.push(name);
            }
          }

          return {
            files: await writeExport(exportDir(input.dir), contents),
            skipped,
          };
        },
      ),
  });
}
