import type { ActivityFeed, NoticeVariant } from "@sitewright/ui";
import type { WebSocketClient } from "../api/web-socket-client.ts";

/** Where the page's socket stands; `unreachable` keeps retrying, but long enough that the page says so. */
export type ConnectionState = "connecting" | "connected" | "retrying" | "unreachable";

/** The socket's state as its store holds it. */
export interface WebConnection {
  readonly state: ConnectionState;
}

export interface Toast {
  readonly id: number;
  readonly message: string;
  readonly variant: NoticeVariant;
  /** A link the toast offers, e.g. to the editor when the browser blocked a new tab. */
  readonly link?: string;
}

/** The page's notifications, and how they come and go. */
export interface ToastState {
  readonly toasts: readonly Toast[];
  show(message: string, variant: NoticeVariant, link?: string): void;
  dismiss(id: number): void;
}

export interface AppProps {
  readonly client: WebSocketClient;
}

export interface AppHeaderProps {
  readonly connection: ConnectionState;
  readonly feed: ActivityFeed;
}

/**
 * Whether this window carries the Framer plugin's bridge: not opened by a plugin, waiting for it to connect,
 * connected, or closed (the plugin stopped or the server dropped the socket).
 */
export type RelayStatus = "no-plugin" | "waiting" | "connected" | "closed";

export interface RelayState {
  readonly state: RelayStatus;
}
