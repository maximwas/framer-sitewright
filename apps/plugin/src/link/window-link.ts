import {
  LOCAL_APP_PORT,
  localAppOrigins,
  type PluginInfo,
  type PluginToWindow,
  parseWindowMessage,
  relayMessage,
  toWireError,
  type WindowToPlugin,
} from "@sitewright/core";
import type { ReadonlyStore } from "@sitewright/ui";
import { createStore } from "zustand/vanilla";
import { HELLO_INTERVAL_MS, WINDOW_SILENT_MS } from "../constants/ui.ts";
import type { LinkStatus, WindowLinkOptions } from "../types/link.ts";

/**
 * The plugin's end of the bridge. A published plugin cannot reach localhost, so the journal window it opens holds the
 * session with the MCP server, and the plugin only runs what the window asks: `run` comes in, `result` or `failure`
 * goes back. The plugin says hello every second while the window is open: an unanswered window (still loading, or an
 * error page while no server runs) answers once it can, and a reloaded one learns the plugin again. Only that window,
 * at its exact origin, is heard.
 */
export class WindowLink {
  readonly #options: WindowLinkOptions;
  readonly #origins: readonly string[];
  readonly #events: EventTarget;
  readonly #status = createStore<LinkStatus>()(() => ({ state: "needs-window" }));
  readonly #eventListeners = new Set<(name: string, data: unknown) => void>();
  #window: Window | null = null;
  #origin: string | null = null;
  #info: Promise<PluginInfo> | null = null;
  #lastAnswer = 0;
  #ticker: ReturnType<typeof setInterval> | undefined;
  #themeObserver: MutationObserver | null = null;
  readonly #onMessageEvent = (event: Event) => this.#onMessage(event as MessageEvent);
  readonly #sayHello = () => void this.#hello();

  constructor(options: WindowLinkOptions) {
    this.#options = options;
    this.#origins = options.origins ?? localAppOrigins(LOCAL_APP_PORT);
    this.#events = options.events ?? window;
    this.#events.addEventListener("message", this.#onMessageEvent);
    // Hidden or shown again, the window hears it at once: a hidden tab's timers run about once a minute.
    globalThis.document?.addEventListener("visibilitychange", this.#sayHello);

    // Framer marks its theme on the plugin's page; the window follows a switch at once.
    if (globalThis.document !== undefined && typeof MutationObserver === "function") {
      this.#themeObserver = new MutationObserver(this.#sayHello);

      for (const element of [globalThis.document.documentElement, globalThis.document.body]) {
        if (element !== null) {
          this.#themeObserver.observe(element, { attributeFilter: ["data-framer-theme"] });
        }
      }
    }
  }

  get status(): ReadonlyStore<LinkStatus> {
    return this.#status;
  }

  /** Server events the window passes on, e.g. "editor.reveal". */
  onEvent(listener: (name: string, data: unknown) => void): void {
    this.#eventListeners.add(listener);
  }

  /** Brings the answering window forward, or opens (reloads) it. Call it from a click: browsers block other popups. */
  show(): void {
    if (this.#window !== null && !this.#window.closed && this.#answering()) {
      this.#window.focus();

      return;
    }

    const opened = this.#options.openWindow(`${this.#origins[0]}/`);

    if (opened !== null) {
      this.#link(opened, this.#origins[0] ?? "");
    }
  }

  /** The user's Reconnect after the bridge stopped for good (another Framer window took it, versions differ). */
  reconnect(): void {
    this.#post(relayMessage({ kind: "reconnect" }));
  }

  /** Stops saying hello and listening: the window's messages, the page's visibility and the editor theme. */
  dispose(): void {
    clearInterval(this.#ticker);
    this.#events.removeEventListener("message", this.#onMessageEvent);
    globalThis.document?.removeEventListener("visibilitychange", this.#sayHello);
    this.#themeObserver?.disconnect();
    this.#themeObserver = null;
  }

  #link(target: Window, origin: string): void {
    this.#window = target;
    this.#origin = origin;
    this.#lastAnswer = 0;
    this.#info ??= this.#options.pluginInfo();
    this.#setStatus({ state: "waiting" });
    clearInterval(this.#ticker);
    this.#ticker = setInterval(() => this.#tick(), HELLO_INTERVAL_MS);
    void this.#hello();
  }

  /** Every second: a closed window ends the link, a silent one is waited for again, and the hello goes out. */
  #tick(): void {
    if (this.#window === null || this.#window.closed) {
      clearInterval(this.#ticker);
      this.#window = null;
      this.#setStatus({ state: "needs-window" });

      return;
    }

    if (!this.#answering()) {
      this.#setStatus({ state: "waiting" });
    }

    void this.#hello();
  }

  async #hello(): Promise<void> {
    if (this.#info !== null) {
      this.#post(
        relayMessage({
          kind: "hello",
          plugin: await this.#info,
          hidden: globalThis.document?.hidden ?? false,
          ...editorTheme(),
        }),
      );
    }
  }

  #onMessage({ data, origin, source }: MessageEvent): void {
    const message = this.#origins.includes(origin) ? parseWindowMessage(data) : null;

    if (message === null || source === null) {
      return;
    }

    // A (re)loaded window that this plugin opened says ready: answer at once instead of at the next tick.
    if (message.kind === "ready") {
      this.#link(source as Window, origin);
    } else if (source === this.#window && origin === this.#origin) {
      this.#onWindowMessage(message);
    }
  }

  #onWindowMessage(message: Exclude<WindowToPlugin, { kind: "ready" }>): void {
    switch (message.kind) {
      case "status":
        this.#lastAnswer = Date.now();
        this.#setStatus(
          message.state === "stopped"
            ? {
                state: "stopped",
                closeCode: message.closeCode,
              }
            : { state: message.state },
        );
        break;
      case "run":
        void this.#run(message);
        break;
      case "event":
        for (const listener of this.#eventListeners) {
          listener(message.name, message.data);
        }

        break;
    }
  }

  async #run({ id, op, input, journal }: Extract<WindowToPlugin, { kind: "run" }>): Promise<void> {
    let answer: PluginToWindow;

    try {
      answer = relayMessage({
        kind: "result",
        id,
        result: await this.#options.handle(op, input, { journal }),
      });
    } catch (error) {
      answer = relayMessage({
        kind: "failure",
        id,
        error: toWireError(error),
      });
    }

    try {
      this.#post(answer);
    } catch (error) {
      // Not something postMessage can copy (a function, a Framer object): the window gets the reason instead.
      this.#post(
        relayMessage({
          kind: "failure",
          id,
          error: {
            code: "RESULT_NOT_SERIALIZABLE",
            message: error instanceof Error ? error.message : String(error),
          },
        }),
      );
    }
  }

  #answering(): boolean {
    return Date.now() - this.#lastAnswer < WINDOW_SILENT_MS;
  }

  #post(message: PluginToWindow): void {
    if (this.#window !== null && this.#origin !== null && !this.#window.closed) {
      this.#window.postMessage(message, this.#origin);
    }
  }

  #setStatus(status: LinkStatus): void {
    this.#status.setState(status, true);
  }
}

/** Framer's editor theme, as it marks the plugin's body; nothing outside the editor. */
function editorTheme(): { theme?: "light" | "dark" } {
  const theme =
    globalThis.document?.body?.dataset["framerTheme"] ?? globalThis.document?.documentElement?.dataset["framerTheme"];

  return theme === "dark" || theme === "light" ? { theme } : {};
}
