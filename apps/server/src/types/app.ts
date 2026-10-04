import type { McpServer } from "@modelcontextprotocol/server";
import type { TransportRouter } from "../transports/router.ts";
import type { Logger } from "./logging.ts";

export interface App {
  readonly server: McpServer;
  readonly transports: TransportRouter;
  readonly logger: Logger;
  /** Closes the Framer connections, the plugin bridge and the MCP server. */
  close(): Promise<void>;
}
