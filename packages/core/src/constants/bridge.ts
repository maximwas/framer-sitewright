/**
 * Bumped on every breaking change; the server closes a session with another version (4426).
 * 2 (29.09.2026): request.timeoutMs replaced deadlineMs; journaled requests; plugin UI calls and server events.
 * 3 (04.10.2026): the plugin no longer calls the server (the journal moved to the local app's page).
 */
export const BRIDGE_PROTOCOL_VERSION = 3;

export const BRIDGE_PATH = "/sitewright/v1";

/** The local app's port: the bridge window, its sockets and the journal (SITEWRIGHT_BRIDGE_PORT changes it). */
export const LOCAL_APP_PORT = 18_710;

/**
 * Plugin origins the bridge window accepts: the development plugin, and the published one where Framer serves it (read
 * from the marketplace plugin's frame, 08.10.2026). Only Sitewright's own origins: any other plugin on
 * plugins.framercdn.com could otherwise pose as Sitewright. SITEWRIGHT_PLUGIN_ORIGINS adds more.
 */
export const DEFAULT_PLUGIN_ORIGINS: readonly string[] = [
  "https://localhost:5173",
  "https://5iqjj58d3q5bu5e29j5lpq0po.plugins.framercdn.com",
];

/** The bridge window's name, so a second Connect reuses the open window instead of opening another. */
export const BRIDGE_WINDOW_NAME = "sitewright-bridge";

/** Where the bridge window learns which plugin origins it may relay for. */
export const BRIDGE_INFO_PATH = "/api/bridge";

/** Where the CLI learns which project the plugin is open in (`sitewright key`). */
export const LOCAL_STATUS_PATH = "/api/status";

/** Marks relay messages among everything else postMessage may carry. */
export const RELAY_SOURCE = "sitewright";

/**
 * Bumped on every breaking change of the relay messages.
 * 2 (04.10.2026): the window speaks the bridge protocol, the plugin only runs operations (plan 7).
 */
export const RELAY_VERSION = 2;

/**
 * Server maxPayload; the plugin refuses to send more. A stdio MCP message breaks above 10 MiB, and a
 * tool result travels twice in it (text content and structuredContent).
 */
export const MAX_MESSAGE_BYTES = 4 * 1024 * 1024;

/** WebSocket close codes of the bridge; 4xxx are its own. */
export const CloseCode = {
  GoingAway: 1001,
  BadMessage: 4400,
  HelloTimeout: 4408,
  Superseded: 4409,
  VersionMismatch: 4426,
} as const;

/** The plugin must NOT auto-reconnect after these (user action / reload needed). */
export const NO_RECONNECT_CODES: ReadonlySet<number> = new Set([CloseCode.Superseded, CloseCode.VersionMismatch]);
