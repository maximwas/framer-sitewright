import {
  BridgeError,
  CloseCode,
  type PluginInfo,
  type PluginToWindow,
  parsePluginMessage,
  relayMessage,
  type WindowToPlugin,
} from "@sitewright/core";
import {
  PLUGIN_CLOSED_POLL_MS,
  PLUGIN_SILENT_HIDDEN_MS,
  PLUGIN_SILENT_MS,
  READY_INTERVAL_MS,
} from "../constants/bridge.ts";
import { relayStore } from "../store/relay-store.ts";
import type { BridgeStatus, LinkedPlugin, PendingRun, PluginBridgeOptions } from "../types/bridge.ts";
import { BridgeClient } from "./bridge-client.ts";

/**
 * Makes this window the Framer plugin's way to the MCP server. A published plugin cannot reach localhost itself, but it
 * can open this window and talk to it with postMessage. So the window holds the plugin's session with the server (the
 * bridge protocol, the request queue, deadlines, reconnects) and only asks the plugin to run operations: `run` goes
 * out, `result` or `failure` comes back. The plugin says `hello` first; only an allowed plugin origin is heard, and
 * after the hello only that window; answers go to its exact origin.
 */
export class PluginBridge {
  readonly #options: PluginBridgeOptions;
  readonly #events: EventTarget;
  readonly #allowed: ReadonlySet<string>;
  readonly #pending = new Map<string, PendingRun>();
  #plugin: LinkedPlugin | null = null;
  #client: BridgeClient | null = null;
  #unsubscribe: (() => void) | null = null;
  #watch: ReturnType<typeof setInterval> | undefined;
  #announce: ReturnType<typeof setInterval> | undefined;
  /** When the linked plugin was last heard: a hello, or an answer to a call. */
  #heardAt = 0;
  /** Whether its editor tab was hidden at its last hello. */
  #hidden = false;
  #sequence = 0;

  constructor(options: PluginBridgeOptions) {
    this.#options = options;
    this.#events = options.events ?? window;
    this.#allowed = new Set(options.pluginOrigins);
  }

  /** Listens for the plugin; a plugin that opened this page hears `ready` at once, so it need not wait for its timer. */
  start(): void {
    const opener = this.#options.opener ?? null;

    this.#events.addEventListener("message", this.#onMessage);
    relayStore.setState({ state: opener === null ? "no-plugin" : "waiting" });

    this.#sayReady(opener);
    // Until a plugin links, and again after one goes: a plugin reloaded in place has a page that knows no window.
    this.#announce = setInterval(() => {
      if (this.#plugin === null) {
        this.#sayReady(opener);
      }
    }, this.#options.readyMs ?? READY_INTERVAL_MS);
  }

  #sayReady(opener: Window | null): void {
    if (opener === null || opener.closed) {
      return;
    }

    // Only the opener's own origin takes it; the browser drops the copies sent to the other allowed origins.
    for (const origin of this.#allowed) {
      opener.postMessage(relayMessage({ kind: "ready" }), origin);
    }
  }

  /** Ends the session: the server sees the plugin go. */
  close(): void {
    clearInterval(this.#announce);
    this.#events.removeEventListener("message", this.#onMessage);
    this.#unlink("window closed");
  }

  /** Retries now instead of waiting for a timer that a hidden window throttles. */
  retryNow(): void {
    if (this.#client?.connection.getState().state === "retrying") {
      this.#client.reconnect();
    }
  }

  #onMessage = (event: Event): void => {
    const { data, origin, source } = event as MessageEvent;
    const message = this.#allowed.has(origin) ? parsePluginMessage(data) : null;

    if (message === null || source === null) {
      return;
    }

    if (message.kind === "hello") {
      this.#hidden = message.hidden ?? false;

      if (message.theme !== undefined) {
        this.#options.onTheme?.(message.theme);
      }

      this.#onHello(source as Window, origin, message.plugin);
    } else if (this.#plugin?.source === source) {
      this.#heardAt = Date.now();
      this.#onPluginMessage(message);
    }
  };

  /** A plugin introduces itself. The same one again (its hello repeats until answered) only hears the status again. */
  #onHello(source: Window, origin: string, info: PluginInfo): void {
    this.#heardAt = Date.now();

    if (this.#plugin?.source === source && this.#client !== null) {
      this.#tellStatus(this.#client.connection.getState());

      return;
    }

    // The plugin this one replaces shows "Taken over", as when another Framer window takes the bridge.
    this.#post(
      relayMessage({
        kind: "status",
        state: "stopped",
        closeCode: CloseCode.Superseded,
      }),
    );
    this.#unlink("replaced by another plugin window");
    this.#plugin = {
      source,
      origin,
    };

    const client = new BridgeClient({
      url: this.#options.socketUrl,
      plugin: info,
      handle: (op, input, { journal }) => this.#run(op, input, journal),
    });

    this.#client = client;
    this.#unsubscribe = client.connection.subscribe((status) => this.#tellStatus(status));
    client.onEvent((name, eventData) =>
      this.#post(
        relayMessage({
          kind: "event",
          name,
          data: eventData,
        }),
      ),
    );

    const silentMs = this.#options.silentMs ?? PLUGIN_SILENT_MS;
    const hiddenSilentMs = this.#options.hiddenSilentMs ?? PLUGIN_SILENT_HIDDEN_MS;

    this.#watch = setInterval(
      () => {
        if (source.closed) {
          this.#unlink("plugin closed");
          relayStore.setState({ state: "closed" });
        } else if (Date.now() - this.#heardAt > (this.#hidden ? hiddenSilentMs : silentMs)) {
          this.#unlink("plugin stopped answering");
          relayStore.setState({ state: "waiting" });
        }
      },
      Math.min(PLUGIN_CLOSED_POLL_MS, silentMs),
    );
    client.start();
    this.#tellStatus(client.connection.getState());
  }

  #onPluginMessage(message: Exclude<PluginToWindow, { kind: "hello" }>): void {
    switch (message.kind) {
      case "result":
        this.#settle(message.id)?.resolve(message.result);
        break;
      case "failure":
        this.#settle(message.id)?.reject(
          new BridgeError(message.error.code, message.error.message, message.error.data),
        );
        break;
      case "reconnect":
        this.#client?.reconnect();
        break;
    }
  }

  /** Asks the plugin to run an operation; settles with its result or its error. */
  #run(op: string, input: unknown, journal: boolean): Promise<unknown> {
    if (this.#plugin === null) {
      return Promise.reject(new BridgeError("PLUGIN_DISCONNECTED", "The Framer plugin closed."));
    }

    const id = String(++this.#sequence);

    return new Promise((resolve, reject) => {
      this.#pending.set(id, {
        resolve,
        reject,
      });
      this.#post(
        relayMessage({
          kind: "run",
          id,
          op,
          input,
          journal,
        }),
      );
    });
  }

  #settle(id: string): PendingRun | undefined {
    const pending = this.#pending.get(id);

    this.#pending.delete(id);

    return pending;
  }

  #tellStatus(status: BridgeStatus): void {
    relayStore.setState({ state: status.state === "connected" ? "connected" : "waiting" });
    this.#post(
      relayMessage({
        kind: "status",
        state: status.state,
        closeCode: status.state === "retrying" || status.state === "stopped" ? status.closeCode : null,
      }),
    );
  }

  /** Drops the plugin: its session with the server ends, and runs it never answered fail. */
  #unlink(reason: string): void {
    clearInterval(this.#watch);
    this.#unsubscribe?.();
    this.#unsubscribe = null;
    this.#client?.stop(reason);
    this.#client = null;
    this.#plugin = null;

    for (const pending of this.#pending.values()) {
      pending.reject(new BridgeError("PLUGIN_DISCONNECTED", `The Framer plugin went away: ${reason}.`));
    }

    this.#pending.clear();
  }

  #post(message: WindowToPlugin): void {
    const plugin = this.#plugin;

    if (plugin !== null && !plugin.source.closed) {
      plugin.source.postMessage(message, plugin.origin);
    }
  }
}
