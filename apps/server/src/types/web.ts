import type { LocalStatus, ServerToPlugin } from "@sitewright/core";
import type { BridgeLog } from "./bridge.ts";

/** What the local app's HTTP side needs. */
export interface LocalAppOptions {
  /** The built web app (dist/web in the package, apps/web/dist in the workspace), or null when it is missing. */
  readonly root: string | null;
  readonly port: number;
  /** Plugin origins the bridge window relays for (GET /api/bridge). */
  readonly pluginOrigins: readonly string[];
  /** GET /api/status: the plugin's project and editor link, for the CLI. */
  readonly status: () => LocalStatus;
  readonly log: BridgeLog;
}

/** What the server sends the journal panel: the same events and call results as the plugin window gets. */
export type PanelMessage = Extract<ServerToPlugin, { type: "event" | "call_result" }>;
