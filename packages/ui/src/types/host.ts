import type { StoreApi } from "zustand";
import type { ActivityItem } from "./activity.ts";

/** How a notification looks. */
export type NoticeVariant = "info" | "success" | "warning" | "error";

/** A zustand store that others read and watch but do not set: its owner keeps it current. */
export type ReadonlyStore<T> = Pick<StoreApi<T>, "getState" | "getInitialState" | "subscribe">;

/** Where a panel's connection stands; each transport adds its own details. */
export interface ConnectionSnapshot {
  /** "connected" once the server can be reached. */
  readonly state: string;
}

/** How the panel reaches the sitewright server: the page's own WebSocket. */
export interface UiTransport {
  call(method: string, params: unknown): Promise<unknown>;
  /** Server events, e.g. "activity.appended". Returns a function that unsubscribes. */
  onEvent(listener: (name: string, data: unknown) => void): () => void;
  /** The connection as a zustand store, so panels re-render when it changes. */
  readonly connection: ReadonlyStore<ConnectionSnapshot>;
}

/** What the panel needs from the page it runs on: open an item in the editor, tell the user something. */
export interface EditorHost {
  reveal(item: ActivityItem): Promise<void>;
  notify(message: string, variant: NoticeVariant): void;
}
