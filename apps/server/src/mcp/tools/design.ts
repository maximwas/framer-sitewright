import type { McpServer } from "@modelcontextprotocol/server";
import { designApply } from "@sitewright/core";
import { DESIGN_APPLY_DESCRIPTION } from "../../constants/mcp.ts";
import type { ToolContext } from "../../types/mcp.ts";
import { addOperationTool } from "../add-tool.ts";

export function registerDesignTools(server: McpServer, context: ToolContext): void {
  addOperationTool(server, context, designApply, {
    name: "design_apply",
    title: "Apply design changes",
    description: DESIGN_APPLY_DESCRIPTION,
  });
}
