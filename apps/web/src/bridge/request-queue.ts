import {
  BridgeError,
  encode,
  MAX_MESSAGE_BYTES,
  type PluginToServer,
  type RequestMessage,
  toWireError,
} from "@sitewright/core";
import type { RequestHandler } from "../types/bridge.ts";
import { runBeforeDeadline } from "../utils/deadline.ts";
import { exceedsBytes } from "../utils/message-size.ts";

/**
 * Answers the server's requests one at a time, in arrival order, each on the socket it came in on. A request's
 * timeout counts from its arrival, so time spent waiting in the queue counts too.
 */
export class RequestQueue {
  readonly #handle: RequestHandler;
  #tail: Promise<void> = Promise.resolve();

  constructor(handle: RequestHandler) {
    this.#handle = handle;
  }

  enqueue(socket: WebSocket, request: RequestMessage): void {
    const deadline = Date.now() + request.timeoutMs;

    // One request whose reply cannot be sent must not block the requests behind it.
    this.#tail = this.#tail.then(() => this.#answer(socket, request, deadline)).catch(() => {});
  }

  async #answer(socket: WebSocket, request: RequestMessage, deadline: number): Promise<void> {
    const response = await this.#respond(request, deadline);

    try {
      send(socket, response);
    } catch (error) {
      // Too large, or not plain JSON (a BigInt from Framer): the server gets the reason instead.
      send(socket, unsendableResponse(request.id, error));
    }
  }

  async #respond(request: RequestMessage, deadline: number): Promise<PluginToServer> {
    try {
      const result = await runBeforeDeadline(
        () => this.#handle(request.op, request.input ?? null, { journal: request.journal ?? false }),
        deadline,
        request.op,
      );

      return {
        type: "response",
        id: request.id,
        ok: true,
        result: result ?? null,
      };
    } catch (error) {
      return {
        type: "response",
        id: request.id,
        ok: false,
        error: toWireError(error),
      };
    }
  }
}

/** Sends a response, refusing one above the server's size limit. Throws when the response is not plain JSON. */
function send(socket: WebSocket, response: PluginToServer): void {
  const text = encode(response);

  if (exceedsBytes(text, MAX_MESSAGE_BYTES)) {
    // The server would close the socket with 1009 and fail every request in flight.
    throw new BridgeError("RESULT_TOO_LARGE", `message is larger than ${MAX_MESSAGE_BYTES} bytes`);
  }

  if (socket.readyState === socket.OPEN) {
    socket.send(text);
  }
}

function unsendableResponse(id: string, error: unknown): PluginToServer {
  const code = error instanceof BridgeError ? error.code : "RESULT_NOT_SERIALIZABLE";
  const message = error instanceof Error ? error.message : String(error);

  return {
    type: "response",
    id,
    ok: false,
    error: {
      code,
      message,
    },
  };
}
