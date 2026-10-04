import { BRIDGE_PROTOCOL_VERSION, decodeServerToPlugin, encode, NO_RECONNECT_CODES } from "@sitewright/core";
import { backoffDelay, NORMAL_CLOSURE, type ReadonlyStore } from "@sitewright/ui";
import { createStore } from "zustand/vanilla";
import type { BridgeClientOptions, BridgeStatus } from "../types/bridge.ts";
import { RequestQueue } from "./request-queue.ts";

/**
 * The plugin's session with the MCP server, held by this window: says hello for the plugin, hands requests to a serial
 * queue, passes the server's events on and reconnects with backoff after a drop. Its status is a zustand store
 * (`connection`) the window shows and tells the plugin.
 */
export class BridgeClient {
  readonly #options: BridgeClientOptions;
  readonly #requests: RequestQueue;
  readonly #eventListeners = new Set<(name: string, data: unknown) => void>();
  readonly #status = createStore<BridgeStatus>()(() => ({
    state: "connecting",
    attempt: 0,
  }));
  #socket: WebSocket | null = null;
  #stopped = false;
  #attempt = 0;
  #retryTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(options: BridgeClientOptions) {
    this.#options = options;
    this.#requests = new RequestQueue(options.handle);
  }

  get connection(): ReadonlyStore<BridgeStatus> {
    return this.#status;
  }

  /** Server events, e.g. "editor.reveal". Returns a function that unsubscribes. */
  onEvent(listener: (name: string, data: unknown) => void): () => void {
    this.#eventListeners.add(listener);

    return () => {
      this.#eventListeners.delete(listener);
    };
  }

  /** Connects, then reconnects after every drop until stop() or a close code that needs the user. */
  start(): void {
    this.#stopped = false;
    this.#connect();
  }

  stop(reason: string): void {
    this.#stopped = true;
    clearTimeout(this.#retryTimer);
    this.#socket?.close(NORMAL_CLOSURE, reason);
    this.#setStatus({
      state: "stopped",
      closeCode: NORMAL_CLOSURE,
      reason,
    });
  }

  /** Connects now with a fresh backoff: skips a pending retry, and resumes after a stop. */
  reconnect(): void {
    this.#attempt = 0;
    this.start();
  }

  #connect(): void {
    clearTimeout(this.#retryTimer);

    const current = this.#socket;
    const busy = current !== null && current.readyState <= current.OPEN; // connecting or open

    if (this.#stopped || busy) {
      return;
    }

    const socket = new WebSocket(this.#options.url);

    this.#setStatus({
      state: "connecting",
      attempt: this.#attempt,
    });
    this.#socket = socket;
    socket.addEventListener("open", () =>
      socket.send(
        encode({
          type: "hello",
          protocol: BRIDGE_PROTOCOL_VERSION,
          plugin: this.#options.plugin,
        }),
      ),
    );
    socket.addEventListener("message", (event) => this.#onMessage(socket, event));
    socket.addEventListener("close", (event) => this.#onClose(socket, event));
  }

  #onMessage(socket: WebSocket, event: MessageEvent): void {
    const message = typeof event.data === "string" ? decodeServerToPlugin(event.data) : null;

    switch (message?.type) {
      case "hello_ack":
        this.#attempt = 0;
        this.#setStatus({
          state: "connected",
          sessionId: message.sessionId,
        });
        break;
      case "request":
        this.#requests.enqueue(socket, message);
        break;
      case "event":
        for (const listener of this.#eventListeners) {
          listener(message.name, message.data ?? null);
        }

        break;
    }
  }

  #onClose(socket: WebSocket, event: CloseEvent): void {
    if (socket !== this.#socket) {
      return; // a replaced socket must not retry or stop its successor
    }

    this.#socket = null;

    if (this.#stopped) {
      return;
    }

    if (NO_RECONNECT_CODES.has(event.code)) {
      this.#stopped = true;
      this.#setStatus({
        state: "stopped",
        closeCode: event.code,
        reason: event.reason,
      });
    } else {
      this.#scheduleRetry(event.code);
    }
  }

  #scheduleRetry(closeCode: number): void {
    const inMs = backoffDelay(this.#attempt);

    this.#attempt += 1;
    this.#setStatus({
      state: "retrying",
      inMs,
      closeCode,
    });
    this.#retryTimer = setTimeout(() => this.#connect(), inMs);
  }

  #setStatus(status: BridgeStatus): void {
    this.#status.setState(status, true);
  }
}
