import type { PluginInfo, PluginPermission } from "@sitewright/core";

/**
 * Where the plugin stands: no journal window; a window that has not answered yet (loading, or an error page while no
 * server runs); or the window's own connection to the MCP server.
 */
export type LinkStatus =
  | { readonly state: "needs-window" }
  | { readonly state: "waiting" }
  | { readonly state: "connecting" }
  | { readonly state: "retrying" }
  | { readonly state: "connected" }
  | { readonly state: "stopped"; readonly closeCode: number | null };

/** Runs one operation by name; with `journal`, it records undo steps and resolves with `{ output, journal }`. */
export type RequestHandler = (operation: string, input: unknown, options: { journal: boolean }) => Promise<unknown>;

/** Whether the current Framer user may call every one of these protected Plugin API methods. */
export type PermissionCheck = (permissions: readonly PluginPermission[]) => boolean;

export interface WindowLinkOptions {
  readonly handle: RequestHandler;
  /** Sent in every hello. */
  readonly pluginInfo: () => Promise<PluginInfo>;
  /** Opens (or reloads) the journal window; only a click may. */
  readonly openWindow: (url: string) => Window | null;
  /** The journal window's origins; by default the local app's (127.0.0.1 and localhost on its port). */
  readonly origins?: readonly string[];
  /** Where the plugin's messages arrive; the plugin's window outside tests. */
  readonly events?: EventTarget;
}
