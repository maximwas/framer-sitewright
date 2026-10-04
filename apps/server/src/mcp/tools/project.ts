import type { McpServer } from "@modelcontextprotocol/server";
import { ActivityNoteSchema, CapabilitiesSchema, projectOverview, projectPublish } from "@sitewright/core";
import type { ToolContext } from "../../types/mcp.ts";
import { addOperationTool, addTool, operationAnnotations, runOperationTool } from "../add-tool.ts";

export function registerProjectTools(server: McpServer, context: ToolContext): void {
  addTool(server, {
    name: "project_overview",
    title: "Project overview",
    description:
      "Summarizes the connected Framer project: web pages with paths, design pages, counts of color tokens, text styles, components and CMS collections, and what its Framer plan allows (capabilities). Start here.",
    input: projectOverview.input,
    output: projectOverview.output.extend({
      capabilities: CapabilitiesSchema.nullable(),
      activity: ActivityNoteSchema,
    }),
    annotations: operationAnnotations(projectOverview),
    run: async (args) => ({
      ...(await runOperationTool(context, "project_overview", projectOverview, args)),
      capabilities: await context.capabilities.current(),
    }),
  });
  addOperationTool(server, context, projectPublish, {
    name: "project_publish",
    title: "Publish the site",
    description:
      "Publishes the site as it is in the editor: to staging when the project has staging on, otherwise live to visitors. Only when the user asks to publish. Returns the deployment's first status (optimization goes on after it) and the address; a failed status means Framer could not publish, tell the user.",
  });
}
