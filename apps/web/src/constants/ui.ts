import type { NoticeVariant } from "@sitewright/ui";
import type { ConnectionState, RelayStatus } from "../types/web.ts";

export const CONNECTION_LABELS: Readonly<Record<ConnectionState, string>> = {
  connecting: "Connecting…",
  connected: "Connected",
  retrying: "Reconnecting…",
  unreachable: "Server unreachable",
};

/** The connection badge: a pill with a dot, green while the page is connected. */
export const CONNECTION_BADGE_COLORS: Readonly<Record<ConnectionState, string>> = {
  connecting: "bg-framer-text-tertiary/15 text-framer-text-secondary",
  connected: "bg-emerald-500/15 text-emerald-500",
  retrying: "bg-amber-500/15 text-amber-600",
  unreachable: "bg-red-500/15 text-red-500",
};

export const CONNECTION_DOT_COLORS: Readonly<Record<ConnectionState, string>> = {
  connecting: "bg-framer-text-tertiary",
  connected: "bg-emerald-500",
  retrying: "bg-amber-500",
  unreachable: "bg-red-500",
};

/** Under the header while the server is unreachable. */
export const UNREACHABLE_HINT =
  "The MCP server is not running: open Claude Code with the server connected (/mcp). This page reconnects by itself.";

/** Under the header: whether this window carries the Framer plugin's bridge. Nothing when no plugin opened it. */
export const RELAY_LABELS: Readonly<Record<RelayStatus, string | null>> = {
  "no-plugin": null,
  waiting: "Waiting for the Framer plugin…",
  connected: "Framer plugin connected through this window. Keep it open.",
  closed: "Framer plugin disconnected. Click Connect in the plugin to reconnect.",
};

export const TOAST_COLORS: Readonly<Record<NoticeVariant, string>> = {
  info: "bg-framer-text text-framer-bg",
  success: "bg-emerald-600 text-white",
  warning: "bg-amber-500 text-black",
  error: "bg-red-600 text-white",
};
