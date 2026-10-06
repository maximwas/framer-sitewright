import type { McpServer } from "@modelcontextprotocol/server";
import { designApply, effectsSet } from "@sitewright/core";
import { DESIGN_APPLY_DESCRIPTION, EFFECTS_SET_DESCRIPTION } from "../../constants/mcp.ts";
import type { ToolContext } from "../../types/mcp.ts";
import { addOperationTool } from "../add-tool.ts";

export function registerDesignTools(server: McpServer, context: ToolContext): void {
  addOperationTool(server, context, designApply, {
    name: "design_apply",
    title: "Apply design changes",
    description: DESIGN_APPLY_DESCRIPTION,
  });
  addOperationTool(server, context, effectsSet, {
    name: "effects_set",
    title: "Set motion effects",
    description: EFFECTS_SET_DESCRIPTION,
  });
}
