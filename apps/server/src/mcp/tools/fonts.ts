import type { McpServer } from "@modelcontextprotocol/server";
import { fontsSearch } from "@sitewright/core";
import type { ToolContext } from "../../types/mcp.ts";
import { addOperationTool } from "../add-tool.ts";

export function registerFontTools(server: McpServer, context: ToolContext): void {
  addOperationTool(server, context, fontsSearch, {
    name: "fonts_search",
    title: "Search fonts",
    description:
      "Searches fonts by family name: Framer's library with its weights and styles, and fonts uploaded to the project (source project) with the variants its text styles use. Framer swaps a weight the project lacks without an error; text_styles_upsert reports that as fontFallbacks.",
  });
}
