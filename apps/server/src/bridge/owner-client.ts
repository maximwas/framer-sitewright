import { BridgeError, CloseCode, type PluginInfo } from "@sitewright/core";
import WebSocket, { type RawData } from "ws";
import {
  BRIDGE_TOKEN_HEADER,
  PEER_JOIN_TIMEOUT_MS,
  PEER_PATH,
  PEER_PROTOCOL_VERSION,
  PEER_TIMEOUT_MARGIN_MS,
  REQUEST_TIMEOUT_MS,
} from "../constants/bridge.ts";
import { OwnerToPeerSchema } from "../schemas/peer.ts";
import type { OwnerClientOptions, OwnerToPeer, PeerToOwner, PluginLink } from "../types/bridge.ts";
import { PendingRequests } from "./pending-requests.ts";

/**
 * This process's way to the plugin while another sitewright process (another Claude Code session) owns the bridge
 * port: it joins the owner as a peer, and the owner hands its operations and events to the plugin.
 */
export class OwnerClient implements PluginLink {
  readonly #options: OwnerClientOptions;
  readonly #pending = new PendingRequests();
  #socket: WebSocket | null = null;
  #plugin: PluginInfo | null = null;
  #sequence = 0;
  #lastCloseCode: number | null = null;

  constructor(options: OwnerClientOptions) {
    this.#options = options;
  }

  /** Why the last join or link ended, e.g. 4426 when the owner runs another version; null before any. */
  get lastCloseCode(): number | null {
    return this.#lastCloseCode;
  }

  /**
   * Joins the owner. Resolves true once it answered, false when it refused or was gone; `onLost` runs when a link that
   * was up drops later (the owner's session ended), so the caller can take the port over or join the next owner.
   */
  join(onLost: () => void): Promise<boolean> {
    const { port, token } = this.#options;

    return new Promise((resolve) => {
      const socket = new WebSocket(`ws://127.0.0.1:${port}${PEER_PATH}`, {
        headers: { [BRIDGE_TOKEN_HEADER]: token },
        perMessageDeflate: false,
        handshakeTimeout: PEER_JOIN_TIMEOUT_MS,
      });
      let joined = false;
      // An owner that never answers: dropping the socket closes it, and the close handler resolves false.
      const deadline = setTimeout(() => socket.terminate(), PEER_JOIN_TIMEOUT_MS);

      socket.on("open", () =>
        this.#send(socket, {
          type: "peer_hello",
          protocol: PEER_PROTOCOL_VERSION,
        }),
      );
      socket.on("message", (data: RawData) => {
        const message = parse(data);

        if (message?.type === "plugin_status") {
          this.#plugin = message.plugin;

          if (!joined) {
            joined = true;
            clearTimeout(deadline);
            this.#socket = socket;
            resolve(true);
          }
        } else if (message?.type === "response") {
          this.#pending.settle(message);
        }
      });
      // A refused or broken connection closes right after; the close handler decides.
      socket.on("error", (error) => this.#options.log("owner link error", { error: String(error) }));
      socket.on("close", (code) => {
        clearTimeout(deadline);
        this.#lastCloseCode = code;
        this.#plugin = null;
        this.#pending.failAll(code);

        if (this.#socket === socket) {
          this.#socket = null;
        }

        if (joined) {
          onLost();
        } else {
          resolve(false);
        }
      });
    });
  }

  plugin(): PluginInfo | null {
    return this.#plugin;
  }

  request(op: string, input: unknown, { journal = false }: { journal?: boolean } = {}): Promise<unknown> {
    const socket = this.#socket;

    if (socket === null || socket.readyState !== socket.OPEN) {
      return Promise.reject(new BridgeError("PLUGIN_NOT_CONNECTED", "The plugin bridge's owner is not reachable."));
    }

    const id = String(++this.#sequence);
    const answer = this.#pending.track(id, op, REQUEST_TIMEOUT_MS + PEER_TIMEOUT_MARGIN_MS);

    this.#send(socket, {
      type: "request",
      id,
      op,
      input: input ?? null,
      timeoutMs: REQUEST_TIMEOUT_MS,
      ...(journal ? { journal } : {}),
    });

    return answer;
  }

  notify(name: string, data: unknown): void {
    if (this.#socket !== null) {
      this.#send(this.#socket, {
        type: "event",
        name,
        data: data ?? null,
      });
    }
  }

  close(): void {
    this.#socket?.close(CloseCode.GoingAway, "peer shutting down");
  }

  #send(socket: WebSocket, message: PeerToOwner): void {
    if (socket.readyState === socket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  }
}

function parse(data: RawData): OwnerToPeer | null {
  try {
    const parsed = OwnerToPeerSchema.safeParse(JSON.parse(data.toString()));

    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
