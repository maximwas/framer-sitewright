import type { McpServer } from "@modelcontextprotocol/server";
import { PRODUCT } from "@sitewright/core";
import * as z from "zod";
import { StatusOutputSchema } from "../../schemas/mcp.ts";
import { TransportModeSchema } from "../../schemas/transports.ts";
import type { ToolContext } from "../../types/mcp.ts";
import { addTool } from "../add-tool.ts";

export function registerStatusTools(server: McpServer, { transports, capabilities }: ToolContext): void {
  // Never asks Framer: the status must answer even when Framer does not.
  const status = () => ({
    ...transports.status(),
    capabilities: capabilities.known(),
  });

  addTool(server, {
    name: "framer_status",
    title: "Framer connection status",
    description:
      "Shows the active transport (Server API or the Framer plugin), whether each one is configured and connected, what to do if not, the projects with a saved Server API key (framer_connect { project } switches between them), and what the project's Framer plan allows. Call it when a Framer tool fails.",
    input: z.strictObject({}),
    output: StatusOutputSchema,
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: false,
    },
    run: async () => status(),
  });
  addTool(server, {
    name: "framer_connect",
    title: "Choose Framer transport or project",
    description: `Switches how tools reach Framer, which project they edit, or both. transport: "server-api" (API key, headless, DSL + screenshots), "plugin" (the ${PRODUCT.pluginTitle} plugin open in the editor; Plugin API only) or "auto" (everything through the connected plugin, the DSL through the Server API of its project; nothing runs while the plugin is not connected). project: when the user names another project, switch to it here, by name from framer_status's projects (only those have a saved key); the plugin follows only if it is open in that project. Returns the new status.`,
    input: z.strictObject({
      transport: TransportModeSchema.optional().describe("Leave out to keep the current one."),
      project: z
        .string()
        .nullable()
        .optional()
        .describe(
          "A project with a saved Server API key, by name, id or editor link: the Server API switches to it, also without the plugin, until the plugin is opened in another project. null: follow the plugin's project again. Leave out to keep the current one.",
        ),
      reconnect: z
        .boolean()
        .default(false)
        .describe(
          "Reopen the Server API session first. It keeps the project as it was when it connected, so after people change things in the editor (vector sets, uploaded fonts, edits) reconnect to see them.",
        ),
    }),
    output: StatusOutputSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    run: async ({ transport, project, reconnect }) => {
      if (transport !== undefined) {
        transports.setMode(transport);
      }

      if (project !== undefined) {
        await transports.useProject(project);
      }

      if (reconnect) {
        await transports.reconnectServerApi();
      }

      return status();
    },
  });
}
