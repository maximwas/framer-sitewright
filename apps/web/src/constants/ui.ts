import type { Tone } from "@sitewright/ui";
import type { ConnectionState, RelayStatus } from "../types/web.ts";

/** The connection in the window bar: a word and its color; the dot pulses while connected. */
export const CONNECTION_STATUS: Readonly<Record<ConnectionState, { readonly label: string; readonly tone: Tone }>> = {
  connecting: {
    label: "Connecting…",
    tone: "neutral",
  },
  connected: {
    label: "Connected",
    tone: "ok",
  },
  retrying: {
    label: "Reconnecting…",
    tone: "warn",
  },
  unreachable: {
    label: "Server unreachable",
    tone: "danger",
  },
};

/** Under the header while the server is unreachable. */
export const UNREACHABLE_HINT =
  "The MCP server is not running: open Claude Code with the server connected (/mcp). This page reconnects by itself.";

/** Under the connection flow: whether this window carries the Framer plugin's bridge, and what to do. */
export const RELAY_LABELS: Readonly<Record<RelayStatus, string>> = {
  "no-plugin": "This page shows the journal. Claude Code reaches Framer through the window the plugin's Connect opens.",
  waiting: "Waiting for the Framer plugin…",
  connected: "Framer plugin connected through this window. Keep it open.",
  closed: "Framer plugin disconnected. Click Connect in the plugin to reconnect.",
};
