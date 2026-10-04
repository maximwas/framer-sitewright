import { encode, toWireError, type WebClientMessage, WebClientMessageSchema, WebCloseCode } from "@sitewright/core";
import type { RawData, WebSocket } from "ws";
import type { CallHandler } from "../types/bridge.ts";
import type { PanelMessage } from "../types/web.ts";

/**
 * One journal panel socket of the local app. Its Origin and Host were checked at the upgrade, so it calls the same API
 * as the plugin window right away, and hears the same events.
 */
export class PanelSession {
  readonly #socket: WebSocket;
  readonly #handle: CallHandler;

  constructor(socket: WebSocket, handle: CallHandler) {
    this.#socket = socket;
    this.#handle = handle;
    socket.on("message", (data: RawData, isBinary: boolean) => this.#onMessage(isBinary ? null : parse(data)));
    // ws closes the socket itself after a protocol error (say, invalid UTF-8); unheard, the error would crash the server.
    socket.on("error", () => undefined);
  }

  /** Pushes a server event, e.g. "activity.appended". */
  notify(name: string, data: unknown): void {
    this.#send({
      type: "event",
      name,
      data: data ?? null,
    });
  }

  #onMessage(message: WebClientMessage | null): void {
    if (message === null) {
      this.#socket.close(WebCloseCode.BadMessage, "invalid message");

      return;
    }

    // Starting inside then() turns a synchronous throw (say, invalid params) into the call's error.
    Promise.resolve()
      .then(() => this.#handle(message.method, message.params ?? null))
      .then(
        (result) =>
          this.#send({
            type: "call_result",
            id: message.id,
            ok: true,
            result: result ?? null,
          }),
        (error: unknown) =>
          this.#send({
            type: "call_result",
            id: message.id,
            ok: false,
            error: toWireError(error),
          }),
      );
  }

  #send(message: PanelMessage): void {
    if (this.#socket.readyState === this.#socket.OPEN) {
      this.#socket.send(encode(message));
    }
  }
}

function parse(data: RawData): WebClientMessage | null {
  try {
    const parsed = WebClientMessageSchema.safeParse(JSON.parse(data.toString()));

    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
