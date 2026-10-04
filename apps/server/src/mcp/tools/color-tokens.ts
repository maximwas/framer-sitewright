import type { McpServer } from "@modelcontextprotocol/server";
import { colorTokensDelete, colorTokensList, colorTokensUpsert } from "@sitewright/core";
import type { ToolContext } from "../../types/mcp.ts";
import { addOperationTool } from "../add-tool.ts";

export function registerColorTokenTools(server: McpServer, context: ToolContext): void {
  addOperationTool(server, context, colorTokensList, {
    name: "color_tokens_list",
    title: "List color tokens",
    description:
      'Lists Framer color styles (tokens) as { id, path, light, dark }. path uses "/" folders like "Brand/Primary".',
  });
  addOperationTool(server, context, colorTokensUpsert, {
    name: "color_tokens_upsert",
    title: "Create or update color tokens",
    description:
      "Creates or updates color tokens by path in one batch (idempotent: unchanged tokens are skipped). Accepts hex, rgb(), hsl(), oklch() or CSS names for light and optional dark. Reference a token elsewhere as var(--token-<id>).",
  });
  addOperationTool(server, context, colorTokensDelete, {
    name: "color_tokens_delete",
    title: "Delete color tokens",
    description:
      'Deletes color tokens by path (every token at a path, if several share it) and whole folders (folders: ["Brand"] deletes everything inside, and so the folder). Tokens Framer refuses to delete come back in failed with the reason; unknown paths and folders in notFound.',
  });
}
