import { McpServer } from "@modelcontextprotocol/server";
import { SERVER_INSTRUCTIONS } from "../constants/mcp.ts";
import type { ToolContext } from "../types/mcp.ts";
import { registerActivityTools } from "./tools/activity.ts";
import { registerAssetTools } from "./tools/assets.ts";
import { registerCmsTools } from "./tools/cms.ts";
import { registerCodeTools } from "./tools/code.ts";
import { registerColorTokenTools } from "./tools/color-tokens.ts";
import { registerComponentTools } from "./tools/components.ts";
import { registerDesignTools } from "./tools/design.ts";
import { registerDocsTools } from "./tools/docs.ts";
import { registerFontTools } from "./tools/fonts.ts";
import { registerLocalizationTools } from "./tools/localization.ts";
import { registerNodeTools } from "./tools/nodes.ts";
import { registerProjectTools } from "./tools/project.ts";
import { registerScreenshotTool } from "./tools/screenshot.ts";
import { registerStatusTools } from "./tools/status.ts";
import { registerTextStyleTools } from "./tools/text-styles.ts";

export function createMcpServer(context: ToolContext, version: string): McpServer {
  const server = new McpServer(
    {
      name: "sitewright",
      version,
    },
    { instructions: SERVER_INSTRUCTIONS },
  );

  registerStatusTools(server, context);
  registerProjectTools(server, context);
  registerColorTokenTools(server, context);
  registerTextStyleTools(server, context);
  registerFontTools(server, context);
  registerNodeTools(server, context);
  registerDesignTools(server, context);
  registerAssetTools(server, context);
  registerComponentTools(server, context);
  registerCodeTools(server, context);
  registerCmsTools(server, context);
  registerLocalizationTools(server, context);
  registerDocsTools(server, context);
  registerScreenshotTool(server, context);
  registerActivityTools(server, context);

  return server;
}
