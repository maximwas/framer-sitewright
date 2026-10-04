import { type CallResultMessage, encode, fromWireError } from "@sitewright/core";
import { CALL_TIMEOUT_MS } from "../constants/connection.ts";
import type { CallSocket, PendingCall } from "../types/connection.ts";

/** Calls a panel makes to the server (e.g. the activity journal), matched to their answers by id. */
export class ServerCalls {
  readonly #pending = new Map<string, PendingCall>();
  #sequence = 0;

  send(socket: CallSocket, method: string, params: unknown): Promise<unknown> {
    const id = String(++this.#sequence);

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.#pending.delete(id);
        reject(new Error(`${method} got no answer in ${CALL_TIMEOUT_MS / 1000} s.`));
      }, CALL_TIMEOUT_MS);

      this.#pending.set(id, {
        resolve,
        reject,
        timer,
      });
      socket.send(
        encode({
          type: "call",
          id,
          method,
          params: params ?? null,
        }),
      );
    });
  }

  settle(message: CallResultMessage): void {
    const pending = this.#pending.get(message.id);

    if (pending === undefined) {
      return; // answered after its timeout
    }

    this.#pending.delete(message.id);
    clearTimeout(pending.timer);

    if (message.ok) {
      pending.resolve(message.result ?? null);
    } else {
      pending.reject(fromWireError(message.error));
    }
  }

  /** The connection closed: no answer can arrive any more. */
  failAll(reason: string): void {
    for (const pending of this.#pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(new Error(reason));
    }

    this.#pending.clear();
  }
}
