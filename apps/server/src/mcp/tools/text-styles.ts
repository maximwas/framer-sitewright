import type { McpServer } from "@modelcontextprotocol/server";
import { textStylesDelete, textStylesList, textStylesUpsert } from "@sitewright/core";
import type { ToolContext } from "../../types/mcp.ts";
import { addOperationTool } from "../add-tool.ts";

export function registerTextStyleTools(server: McpServer, context: ToolContext): void {
  addOperationTool(server, context, textStylesList, {
    name: "text_styles_list",
    title: "List text styles",
    description:
      "Lists Framer text styles (presets) with font, sizes, color (token path or raw value) and breakpoint slots: each slot's label and the width it starts at.",
  });
  addOperationTool(server, context, textStylesUpsert, {
    name: "text_styles_upsert",
    title: "Create or update text styles",
    description:
      'Creates or updates text styles by path in one batch. Font family must exist (use fonts_search); color binds a token with { token: "Brand/Text" }. Only provided attributes change on existing styles.',
  });
  addOperationTool(server, context, textStylesDelete, {
    name: "text_styles_delete",
    title: "Delete text styles",
    description:
      'Deletes text styles by path (every style at a path, if several share it) and whole folders (folders: ["mcp-test/live"] deletes everything inside, and so the folder). Styles Framer refuses to delete, e.g. still used by text, come back in failed with the reason; unknown paths and folders in notFound.',
  });
}
