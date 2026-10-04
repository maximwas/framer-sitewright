import { decodeServerToPlugin } from "@sitewright/core";
import { backoffDelay, type ReadonlyStore, ServerCalls, type UiTransport } from "@sitewright/ui";
import { createStore } from "zustand/vanilla";
import { UNREACHABLE_AFTER_ATTEMPTS } from "../constants/web.ts";
import type { ConnectionState, WebConnection } from "../types/web.ts";

/**
 * The journal panel's connection to the sitewright server: the same calls and events as the plugin's bridge. The server
 * checked this page's Origin at the upgrade, so there is nothing to authenticate. Reconnects after a drop; after several
 * failed attempts in a row it says the server is unreachable, and keeps trying.
 */
export class WebSocketClient implements UiTransport {
  readonly #url: string;
  readonly #eventListeners = new Set<(name: string, data: unknown) => void>();
  readonly #calls = new ServerCalls();
  readonly #connection = createStore<WebConnection>()(() => ({ state: "connecting" }));
  #socket: WebSocket | null = null;
  #attempt = 0;
  #retryTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(url: string) {
    this.#url = url;
  }

  /** Where the socket stands; React reads it with zustand's useStore. */
  get connection(): ReadonlyStore<WebConnection> {
    return this.#connection;
  }

  onEvent(listener: (name: string, data: unknown) => void): () => void {
    this.#eventListeners.add(listener);

    return () => {
      this.#eventListeners.delete(listener);
    };
  }

  call(method: string, params: unknown): Promise<unknown> {
    const socket = this.#socket;

    if (socket === null || this.#connection.getState().state !== "connected") {
      return Promise.reject(new Error("Not connected to the sitewright server."));
    }

    return this.#calls.send(socket, method, params);
  }

  start(): void {
    clearTimeout(this.#retryTimer);

    // Unreachable stays until a socket opens, instead of flickering with every attempt.
    if (this.#connection.getState().state !== "unreachable") {
      this.#setState("connecting");
    }

    const socket = new WebSocket(this.#url);

    this.#socket = socket;
    socket.addEventListener("open", () => {
      this.#attempt = 0;
      this.#setState("connected");
    });
    socket.addEventListener("message", (event) => this.#onMessage(event));
    socket.addEventListener("close", () => this.#onClose(socket));
  }

  #onMessage(event: MessageEvent): void {
    const message = typeof event.data === "string" ? decodeServerToPlugin(event.data) : null;

    if (message?.type === "call_result") {
      this.#calls.settle(message);
    } else if (message?.type === "event") {
      for (const listener of this.#eventListeners) {
        listener(message.name, message.data ?? null);
      }
    }
  }

  #onClose(socket: WebSocket): void {
    if (socket !== this.#socket) {
      return;
    }

    this.#socket = null;
    this.#calls.failAll("The connection to the sitewright server closed.");

    this.#setState(this.#attempt + 1 >= UNREACHABLE_AFTER_ATTEMPTS ? "unreachable" : "retrying");
    this.#retryTimer = setTimeout(() => this.start(), backoffDelay(this.#attempt));
    this.#attempt += 1;
  }

  #setState(state: ConnectionState): void {
    this.#connection.setState({ state });
  }
}
