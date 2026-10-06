import type { WebSocketClient } from "../api/web-socket-client.ts";

/** Where the page's socket stands; `unreachable` keeps retrying, but long enough that the page says so. */
export type ConnectionState = "connecting" | "connected" | "retrying" | "unreachable";

/** The socket's state as its store holds it. */
export interface WebConnection {
  readonly state: ConnectionState;
}

export interface AppProps {
  readonly client: WebSocketClient;
}

export interface AppHeaderProps {
  readonly connection: ConnectionState;
}

/**
 * Whether this window carries the Framer plugin's bridge: not opened by a plugin, waiting for it to connect,
 * connected, or closed (the plugin stopped or the server dropped the socket).
 */
export type RelayStatus = "no-plugin" | "waiting" | "connected" | "closed";

export interface RelayState {
  readonly state: RelayStatus;
}
