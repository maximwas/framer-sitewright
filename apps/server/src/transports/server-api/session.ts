import { OperationError } from "@sitewright/core";
import { connect, ErrorCode, type Framer, FramerAPIError, isRetryableError } from "framer-api";
import type { RunOptions, ServerApiSessionOptions } from "../../types/transports.ts";

/** A lost session, thrown directly or as the cause of a partly applied write batch (core's WRITE_FAILED). */
function isSessionLost(error: unknown): boolean {
  const lost = error instanceof OperationError ? error.cause : error;

  return lost instanceof FramerAPIError && (lost.code === ErrorCode.PROJECT_CLOSED || lost.retryable);
}

function notReplayed(error: unknown): OperationError {
  return new OperationError(
    "WRITE_FAILED",
    "The Framer session was lost during the call, so the change may or may not be applied. It was not repeated, because a repeat could apply it twice.",
    "Re-read the affected nodes before retrying; the next call reconnects.",
    { cause: error },
  );
}

const closedError = () => new Error("The Framer session is closed: sitewright is shutting down.");

const disconnect = (framer: Framer) => framer.disconnect().catch(() => undefined);

/** One lazy Server API connection: connects on first use, retries a busy pool, reconnects after a lost session. */
export class ServerApiSession {
  readonly #options: ServerApiSessionOptions;
  #framer: Framer | null = null;
  #connecting: Promise<Framer> | null = null;
  #closed = false;

  constructor(options: ServerApiSessionOptions) {
    this.#options = options;
  }

  get connected(): boolean {
    return this.#framer !== null;
  }

  getFramer(): Promise<Framer> {
    if (this.#closed) {
      return Promise.reject(closedError());
    }

    if (this.#framer !== null) {
      return Promise.resolve(this.#framer);
    }

    this.#connecting ??= this.#connectWithRetry()
      .then((framer) => this.#adopt(framer))
      .finally(() => {
        this.#connecting = null;
      });

    return this.#connecting;
  }

  async run<T>(fn: (framer: Framer) => Promise<T>, { replay }: RunOptions): Promise<T> {
    const framer = await this.getFramer();

    try {
      return await this.#call(framer, fn);
    } catch (error) {
      if (!isSessionLost(error)) {
        throw error;
      }

      if (!replay) {
        throw notReplayed(error);
      }

      this.#options.logger.warn({ err: error }, "Framer session lost, reconnecting once");

      return this.#call(await this.getFramer(), fn);
    }
  }

  /**
   * Drops the connection so the next call opens a new one. A connection keeps its view of the project and may miss what
   * people changed in the editor meanwhile (new vector set items, uploaded fonts).
   */
  async reconnect(): Promise<void> {
    const framer = this.#framer;

    this.#framer = null;

    if (framer !== null) {
      await disconnect(framer);
    }
  }

  async close(): Promise<void> {
    this.#closed = true;

    const framer = this.#framer;

    this.#framer = null;

    if (framer !== null) {
      await disconnect(framer);
    }
  }

  /** Calls `fn` and drops the connection when the call finds it lost, so the next call reconnects. */
  async #call<T>(framer: Framer, fn: (framer: Framer) => Promise<T>): Promise<T> {
    try {
      return await fn(framer);
    } catch (error) {
      if (isSessionLost(error)) {
        await this.#reset(framer);
      }

      throw error;
    }
  }

  /** Drops the connection that failed. A parallel call may have replaced it already; the new one stays. */
  async #reset(failed: Framer): Promise<void> {
    if (this.#framer !== failed) {
      return;
    }

    this.#framer = null;
    await disconnect(failed);
  }

  async #connectWithRetry(): Promise<Framer> {
    const { projectUrl, apiKey, logger } = this.#options;
    const connectFn = this.#options.connectFn ?? ((url: string, key: string) => connect(url, key));
    const maxAttempts = this.#options.maxAttempts ?? 3;
    const baseDelay = this.#options.retryDelayMs ?? 1000;
    const sleep = this.#options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));

    for (let attempt = 1; ; attempt++) {
      try {
        const started = Date.now();
        const framer = await connectFn(projectUrl, apiKey);

        logger.info({ ms: Date.now() - started }, "Connected to Framer Server API");

        return framer;
      } catch (error) {
        if (attempt >= maxAttempts || !isRetryableError(error)) {
          throw error;
        }

        logger.warn(
          {
            err: error,
            attempt,
          },
          "Framer connect failed, retrying",
        );
        await sleep(baseDelay * 2 ** (attempt - 1));
      }
    }
  }

  /** Keeps a new connection, unless close() ran while it was being made. */
  async #adopt(framer: Framer): Promise<Framer> {
    if (this.#closed) {
      await disconnect(framer);

      throw closedError();
    }

    this.#framer = framer;

    return framer;
  }
}
