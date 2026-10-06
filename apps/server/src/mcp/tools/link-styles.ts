import type { McpServer } from "@modelcontextprotocol/server";
import { linkStylesDelete, linkStylesList, linkStylesUpsert, stylesUsage } from "@sitewright/core";
import type { ToolContext } from "../../types/mcp.ts";
import { addOperationTool } from "../add-tool.ts";

export function registerLinkStyleTools(server: McpServer, context: ToolContext): void {
  addOperationTool(server, context, linkStylesList, {
    name: "link_styles_list",
    title: "List link styles",
    description:
      "Lists link styles: how links in text look at rest, under the pointer (hover) and when they point to the page being viewed (current), with colors as a token path and the value it draws, the underline (decoration, its color, style, thickness and offset) and a highlight behind the text (background). Values a style does not set are left out, and Framer does not store decoration none, auto thickness or offset, or zero radius and padding. transition shows a tween a style still has. Needs the project's Server API key: link styles exist only in the DSL.",
  });
  addOperationTool(server, context, linkStylesUpsert, {
    name: "link_styles_upsert",
    title: "Create or update link styles",
    description:
      'Creates or updates link styles by path in one batch; only the values given change, and null removes one. A link in text takes its look from its link style, not from the text: without one Framer draws it in its default blue. Make one per role (navigation, footer, links in body text) with color { token: "Text/Muted" }, a hover color, and on a menu of several pages a current color for the active item; then put linkStylePreset="<path>" on the text with design_apply. A new style needs color. Framer animates link styles only with tween easing, which Sitewright never writes, so colors change at once; transition: null removes a tween.',
  });
  addOperationTool(server, context, linkStylesDelete, {
    name: "link_styles_delete",
    title: "Delete link styles",
    description:
      'Deletes link styles by path (every style at a path, if several share it) and whole folders (folders: ["Links"] deletes everything inside, and so the folder). Framer refuses to delete a style text still uses: it comes back in failed with the reason; styles_usage shows where it is used. Unknown paths and folders come back in notFound.',
  });
  addOperationTool(server, context, stylesUsage, {
    name: "styles_usage",
    title: "Show where styles are used",
    description:
      "Shows which color tokens, text styles and link styles the site uses: for each, how many layers use it (a layer counts once across breakpoints) and where (page paths, components, design pages, layouts); a token also lists the text and link styles that bind it. What nothing uses comes back in unused. Read the whole site (no pagePath) before deleting or swapping a style: with pagePath it reads one page, and unused means unused there. Code files are not searched.",
  });
}
