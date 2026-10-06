/** Where the journal panel's socket connects. */
export const WEB_SOCKET_PATH = "/api/ws";

/** Close codes of the journal panel's socket. */
export const WebCloseCode = {
  BadMessage: 4400,
} as const;

/** Pushed to the journal panels when the plugin opens a project, another one, or goes: the journal shown changes. */
export const PLUGIN_CHANGED_EVENT = "plugin.changed";
