import type { PluginInfo } from "@sitewright/core";

/** Where this window's session with the MCP server, on the plugin's behalf, stands. */
export type BridgeStatus =
  | { readonly state: "connecting"; readonly attempt: number }
  | { readonly state: "connected"; readonly sessionId: string }
  | { readonly state: "retrying"; readonly inMs: number; readonly closeCode: number }
  | { readonly state: "stopped"; readonly closeCode: number; readonly reason: string };

/**
 * Runs one request: an operation name and its input, which the operation validates itself. With `journal`, the plugin
 * records undo steps and resolves with `{ output, journal }`.
 */
export type RequestHandler = (operation: string, input: unknown, options: { journal: boolean }) => Promise<unknown>;

export interface BridgeClientOptions {
  /** The server's plugin socket, e.g. ws://127.0.0.1:18710/sitewright/v1. */
  readonly url: string;
  /** Sent in the hello, the first message of every connection: the plugin this window speaks for. */
  readonly plugin: PluginInfo;
  readonly handle: RequestHandler;
}

export interface PluginBridgeOptions {
  /** The server's plugin socket. */
  readonly socketUrl: string;
  /** Plugin origins the window works for (GET /api/bridge), exact match. */
  readonly pluginOrigins: readonly string[];
  /** Where this window's messages arrive; the window itself outside tests. */
  readonly events?: EventTarget;
  /** The plugin that opened this window, told `ready` at once; null when the page was opened otherwise. */
  readonly opener?: Window | null;
  /** How long the plugin may go without a hello before the window lets it go (PLUGIN_SILENT_MS); shorter in tests. */
  readonly silentMs?: number;
  /** The same for a plugin whose editor tab is hidden. */
  readonly hiddenSilentMs?: number;
  /** READY_INTERVAL_MS in tests. */
  readonly readyMs?: number;
}

/** The plugin this window works for: the window that said hello, at its exact origin. */
export interface LinkedPlugin {
  readonly source: Window;
  readonly origin: string;
}

/** A `run` the plugin has not answered yet. */
export interface PendingRun {
  readonly resolve: (result: unknown) => void;
  readonly reject: (error: Error) => void;
}
