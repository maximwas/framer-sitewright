// The local app: the plugin bridge, the journal page and its socket. Never log to stdout: it is the MCP stdio channel.
import { EventEmitter } from "node:events";
import { createServer, type IncomingMessage, type Server } from "node:http";
import type { Duplex } from "node:stream";
import {
  BridgeError,
  CloseCode,
  localAppOrigins,
  MAX_MESSAGE_BYTES,
  PLUGIN_CHANGED_EVENT,
  type PluginInfo,
  type ServerToPlugin,
} from "@sitewright/core";
import { type WebSocket, WebSocketServer } from "ws";
import { CLOSE_GRACE_MS, HEARTBEAT_MS, REQUEST_TIMEOUT_MS } from "../constants/bridge.ts";
import { WEB_MAX_PAYLOAD_BYTES } from "../constants/web.ts";
import type {
  BridgeLog,
  BridgeServerOptions,
  CallHandler,
  PluginLink,
  PluginSession,
  UpgradePolicy,
  UpgradeRejection,
} from "../types/bridge.ts";
import { serveLocalApp } from "../web/local-app.ts";
import { PanelSession } from "../web/panel-session.ts";
import { closeGracefully, listenOnLoopback } from "./http-lifecycle.ts";
import { PeerConnection } from "./peer-connection.ts";
import { PluginConnection, sendMessage } from "./plugin-connection.ts";
import { checkUpgrade, rejectUpgrade } from "./upgrade-guard.ts";

const notConnected = () =>
  new BridgeError(
    "PLUGIN_NOT_CONNECTED",
    "Framer plugin is not connected: open the plugin in the Framer editor and click Connect.",
  );

/**
 * The local app on 127.0.0.1: the built web app (the journal, and the window that carries the plugin's bridge), the
 * plugin socket the window relays, the journal panel's socket, and the peer socket of other sitewright processes.
 * One plugin session at a time: the last hello wins. Other processes (other Claude Code sessions) cannot take the port,
 * so they join this one as peers: their operations and events go on to the plugin, and they hear when it comes and goes.
 */
export class BridgeServer
  extends EventEmitter<{
    connected: [PluginSession];
    disconnected: [PluginSession, number];
    rejected: [UpgradeRejection];
  }>
  implements PluginLink
{
  readonly #options: BridgeServerOptions;
  readonly #http: Server;
  readonly #webSocketServer = new WebSocketServer({
    noServer: true,
    maxPayload: MAX_MESSAGE_BYTES,
    perMessageDeflate: false,
  });
  readonly #panelSockets = new WebSocketServer({
    noServer: true,
    maxPayload: WEB_MAX_PAYLOAD_BYTES,
    perMessageDeflate: false,
  });
  readonly #connections = new WeakMap<WebSocket, PluginConnection>();
  readonly #peers = new Set<PeerConnection>();
  readonly #panels = new Set<PanelSession>();
  #policy: UpgradePolicy;
  #active: PluginSession | null = null;
  #sequence = 0;
  #heartbeat: ReturnType<typeof setInterval> | undefined;
  #panelHandler: CallHandler | null = null;
  #port: number | null = null;

  constructor(options: BridgeServerOptions) {
    super();
    this.#options = options;
    // No Host and no Origin pass until listen() knows the port.
    this.#policy = {
      allowedHosts: new Set(),
      ownOrigins: new Set(),
      token: options.token,
    };
    this.#http = createServer(
      (request, response) =>
        void serveLocalApp(request, response, {
          root: options.webRoot,
          port: this.#port ?? 0,
          pluginOrigins: options.pluginOrigins,
          status: () => {
            const plugin = this.plugin();

            return {
              plugin:
                plugin === null
                  ? null
                  : {
                      project: plugin.project,
                      editorUrl: plugin.editorUrl ?? null,
                    },
            };
          },
          log: this.#log,
        }),
    );
    this.#http.on("upgrade", this.#onUpgrade);
  }

  /** The port this server listens on, or null before listen() or while another process holds it. */
  get port(): number | null {
    return this.#port;
  }

  get session(): PluginSession | null {
    return this.#active;
  }

  plugin(): PluginInfo | null {
    return this.#active?.info ?? null;
  }

  /** Listens on 127.0.0.1. Resolves with the port, or null while another process (another sitewright) holds it. */
  async listen(): Promise<number | null> {
    const port = await listenOnLoopback(this.#http, this.#options.port);

    if (port === null) {
      return null;
    }

    this.#port = port;
    this.#policy = {
      ...this.#policy,
      allowedHosts: new Set([`127.0.0.1:${port}`, `localhost:${port}`]),
      ownOrigins: new Set(localAppOrigins(port)),
    };
    this.#heartbeat = setInterval(() => this.#checkClients(), HEARTBEAT_MS);
    this.#heartbeat.unref();

    return port;
  }

  /** Frees the port first, so a new server process can take it at once, then says goodbye to the plugin. */
  async close(): Promise<void> {
    clearInterval(this.#heartbeat);

    for (const socket of this.#panelSockets.clients) {
      socket.close(CloseCode.GoingAway, "server shutting down");
    }

    this.#panelSockets.close();
    await closeGracefully(this.#http, this.#webSocketServer, CLOSE_GRACE_MS);
  }

  /**
   * Sends an operation to the active plugin session and resolves with its result. With `journal`, the plugin records
   * undo steps and the result is `{ output, journal }`.
   */
  request(op: string, input: unknown, { journal = false }: { journal?: boolean } = {}): Promise<unknown> {
    const session = this.#active;

    if (session === null || session.socket.readyState !== session.socket.OPEN) {
      return Promise.reject(notConnected());
    }

    const id = String(++this.#sequence);
    const answer = session.pending.track(id, op, REQUEST_TIMEOUT_MS);
    const message: ServerToPlugin = {
      type: "request",
      id,
      op,
      input: input ?? null,
      timeoutMs: REQUEST_TIMEOUT_MS,
      ...(journal ? { journal } : {}),
    };

    sendMessage(session.socket, message, this.#log);

    return answer;
  }

  /** Pushes an event to the active plugin session, if there is one, and to every journal panel. */
  notify(name: string, data: unknown): void {
    for (const panel of this.#panels) {
      panel.notify(name, data);
    }

    const session = this.#active;

    if (session !== null) {
      sendMessage(
        session.socket,
        {
          type: "event",
          name,
          data: data ?? null,
        },
        this.#log,
      );
    }
  }

  /** Answers calls from the journal panels of the local app; without a handler they fail with UNKNOWN_OP. */
  servePanels(handler: CallHandler): void {
    this.#panelHandler = handler;
  }

  #onUpgrade = (request: IncomingMessage, socket: Duplex, head: Buffer): void => {
    const onSocketError = () => socket.destroy();

    socket.on("error", onSocketError);

    const verdict = checkUpgrade(request, this.#policy);
    // Never log request.headers wholesale: they carry the token.
    const { origin, host, "sec-fetch-site": secFetchSite } = request.headers;
    const reason = verdict.status === 403 ? verdict.rejection.reason : null;

    this.#log("upgrade", {
      origin,
      host,
      secFetchSite,
      status: verdict.status,
      reason,
    });

    if (verdict.status !== 101) {
      rejectUpgrade(socket, verdict.status);

      // Only a refused plugin says something about the setup (see the plugin transport's hints).
      if (verdict.status === 403 && verdict.role === "plugin") {
        this.emit("rejected", verdict.rejection);
      }

      return;
    }

    socket.removeListener("error", onSocketError);

    if (verdict.role === "panel") {
      this.#panelSockets.handleUpgrade(request, socket, head, (webSocket) => this.#acceptPanel(webSocket));

      return;
    }

    this.#webSocketServer.handleUpgrade(request, socket, head, (webSocket) =>
      verdict.role === "plugin" ? this.#accept(webSocket) : this.#acceptPeer(webSocket),
    );
  };

  #accept(socket: WebSocket): void {
    const connection = new PluginConnection(socket, {
      serverVersion: this.#options.serverVersion ?? "0.0.0",
      log: this.#log,
      onSession: (session) => this.#activate(session),
      onSessionClosed: (session, code) => this.#deactivate(session, code),
    });

    this.#connections.set(socket, connection);
  }

  #acceptPeer(socket: WebSocket): void {
    const peer = new PeerConnection(socket, {
      log: this.#log,
      relay: (op, input, journal) => this.request(op, input, { journal }),
      forward: (name, data) => this.notify(name, data),
      plugin: () => this.plugin(),
      onClose: () => this.#peers.delete(peer),
    });

    this.#peers.add(peer);
    this.#log("peer joined", { peers: this.#peers.size });
  }

  #acceptPanel(socket: WebSocket): void {
    const panel = new PanelSession(socket, (method, params) => {
      if (this.#panelHandler === null) {
        throw new BridgeError("UNKNOWN_OP", `Nothing serves ${method}.`);
      }

      return this.#panelHandler(method, params);
    });

    this.#panels.add(panel);
    socket.on("close", () => this.#panels.delete(panel));
  }

  #activate(session: PluginSession): void {
    const previous = this.#active;

    this.#active = session; // the last authenticated connection wins
    previous?.socket.close(CloseCode.Superseded, "superseded by a newer plugin connection");
    this.emit("connected", session);
    this.#tellPeers();
    this.#tellPanels();
  }

  #deactivate(session: PluginSession, code: number): void {
    if (this.#active !== session) {
      return;
    }

    this.#active = null;
    this.emit("disconnected", session, code);
    this.#tellPeers();
    this.#tellPanels();
  }

  #tellPeers(): void {
    for (const peer of this.#peers) {
      peer.sendStatus();
    }
  }

  /** The journal panels show the journal of the plugin's project: they reload when it changes. */
  #tellPanels(): void {
    for (const panel of this.#panels) {
      panel.notify(PLUGIN_CHANGED_EVENT, null);
    }
  }

  #checkClients(): void {
    for (const socket of this.#webSocketServer.clients) {
      this.#connections.get(socket)?.checkAlive();
    }
  }

  #log: BridgeLog = (message, data) => {
    this.#options.log?.(message, data);
  };
}
