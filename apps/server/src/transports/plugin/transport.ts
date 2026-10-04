import {
  BridgeError,
  errorMessage,
  fromWireError,
  JournaledResultSchema,
  journalFromWireError,
  type Operation,
  OperationError,
  type PluginInfo,
} from "@sitewright/core";
import type * as z from "zod";
import type { BridgeServer } from "../../bridge/bridge-server.ts";
import type { OwnerClient } from "../../bridge/owner-client.ts";
import { PEER_RETRY_MS } from "../../constants/bridge.ts";
import type { CallHandler, PluginLink, UpgradeRejection } from "../../types/bridge.ts";
import type {
  BridgeState,
  FramerTransport,
  OperationRunOptions,
  PluginTransportOptions,
  PluginUiChannel,
  TransportStatus,
} from "../../types/transports.ts";
import { pluginHint } from "./hints.ts";

const failedState = (error: unknown): BridgeState => ({
  kind: "failed",
  reason: errorMessage(error),
});

/**
 * Runs operations inside the Framer plugin: the bridge sends `{ op, input }`, the plugin runs the operation. Every
 * Claude Code session runs its own sitewright process, and one plugin serves them all: the first process owns the
 * bridge port, the others join it as peers. When the owner goes away, the others take the port over or join the new
 * owner, and the plugin reconnects on its own.
 */
export class PluginTransport implements FramerTransport, PluginUiChannel {
  readonly kind = "plugin";
  readonly #bridge: BridgeServer | null;
  readonly #owner: OwnerClient | null;
  readonly #options: PluginTransportOptions;
  #state: BridgeState;
  #lastRejection: UpgradeRejection | null = null;
  #retryTimer: ReturnType<typeof setTimeout> | undefined;
  #closed = false;

  /** The bridge is off: SITEWRIGHT_PLUGIN_BRIDGE=off. */
  static disabled(options: PluginTransportOptions): PluginTransport {
    return new PluginTransport(null, null, { kind: "disabled" }, options);
  }

  /** The bridge could not be set up, for example because bridge.json is broken. */
  static failed(error: unknown, options: PluginTransportOptions): PluginTransport {
    return new PluginTransport(null, null, failedState(error), options);
  }

  /** Takes the bridge port, or joins the process that owns it; keeps trying in the background until one works. */
  static async connect(
    bridge: BridgeServer,
    owner: OwnerClient,
    options: PluginTransportOptions,
  ): Promise<PluginTransport> {
    const transport = new PluginTransport(
      bridge,
      owner,
      {
        kind: "unavailable",
        closeCode: null,
      },
      options,
    );

    await transport.#connect();

    return transport;
  }

  private constructor(
    bridge: BridgeServer | null,
    owner: OwnerClient | null,
    state: BridgeState,
    options: PluginTransportOptions,
  ) {
    this.#bridge = bridge;
    this.#owner = owner;
    this.#state = state;
    this.#options = options;
    bridge?.on("rejected", (rejection) => {
      this.#lastRejection = rejection;
    });
    bridge?.on("connected", () => {
      this.#lastRejection = null;
    });
  }

  status(): TransportStatus {
    const plugin = this.#link()?.plugin() ?? null;

    return {
      transport: "plugin",
      configured: this.#link() !== null,
      connected: plugin !== null,
      project: plugin?.project ?? null,
      hint: plugin === null ? this.#hint() : null,
    };
  }

  async run<I extends z.ZodObject, O extends z.ZodObject>(
    operation: Operation<I, O>,
    input: unknown,
    { history }: OperationRunOptions = {},
  ): Promise<z.output<O>> {
    const link = this.#link();

    if (link === null) {
      throw new OperationError("NOT_CONFIGURED", "The plugin bridge is not running.", this.#hint());
    }

    const parsedInput = operation.input.parse(input);
    const journal = history !== undefined;
    let result: unknown;

    try {
      result = await link.request(operation.name, parsedInput, { journal });
    } catch (error) {
      // A failed batch may have applied part of its writes: the journal must still learn them.
      const recorded = error instanceof BridgeError ? journalFromWireError(error.data) : null;

      if (recorded !== null) {
        history?.absorb(recorded);
      }

      throw this.#restoreError(error);
    }

    if (!journal) {
      return operation.output.parse(result);
    }

    const { output, journal: recorded } = JournaledResultSchema.parse(result);

    history?.absorb(recorded);

    return operation.output.parse(output);
  }

  /** Journal panels reach only the owner; the handler is set anyway, for when this process becomes the owner. */
  servePanels(handler: CallHandler): void {
    this.#bridge?.servePanels(handler);
  }

  notify(name: string, data: unknown): void {
    this.#link()?.notify(name, data);
  }

  localAppUrl(): string | null {
    const port = this.#options.localAppPort;

    return this.#link() === null || port === null ? null : `http://127.0.0.1:${port}/`;
  }

  isConnected(): boolean {
    return (this.#link()?.plugin() ?? null) !== null;
  }

  pluginInfo(): PluginInfo | null {
    return this.#link()?.plugin() ?? null;
  }

  close(): Promise<void> {
    this.#closed = true;
    clearTimeout(this.#retryTimer);
    this.#owner?.close();

    return this.#bridge?.close() ?? Promise.resolve();
  }

  /** How this process reaches the plugin now: as the owner, through the owner, or not at all. */
  #link(): PluginLink | null {
    switch (this.#state.kind) {
      case "listening":
        return this.#bridge;
      case "peer":
        return this.#owner;
      default:
        return null;
    }
  }

  #hint(): string {
    return pluginHint(this.#state, this.#lastRejection, this.#options.serverApiConfigured());
  }

  /** Errors cross the bridge as BridgeError; an operation's own error gets its code, reason and hint back. */
  #restoreError(error: unknown): unknown {
    if (!(error instanceof BridgeError)) {
      return error;
    }

    if (error.code === "PLUGIN_NOT_CONNECTED") {
      return new OperationError("NOT_CONFIGURED", "The Framer plugin is not connected.", this.#hint());
    }

    return fromWireError({
      code: error.code,
      message: error.message,
      data: error.data,
    });
  }

  /** Takes the port if it is free, joins its owner if not, and tries again later if neither works. */
  async #connect(): Promise<void> {
    const bridge = this.#bridge;
    const owner = this.#owner;

    if (bridge === null || owner === null || this.#closed) {
      return;
    }

    let port: number | null;

    try {
      port = await bridge.listen();
    } catch (error) {
      this.#options.logger.error({ err: error }, "Plugin bridge failed to start; the Server API still works");
      this.#state = failedState(error);

      return;
    }

    if (this.#closed) {
      await bridge.close();

      return;
    }

    if (port !== null) {
      this.#state = { kind: "listening" };
      this.#options.logger.info({ port }, "Plugin bridge listening on 127.0.0.1: this session owns it");

      return;
    }

    await this.#join(owner);
  }

  async #join(owner: OwnerClient): Promise<void> {
    const joined = await owner.join(() => this.#ownerLost());

    if (this.#closed) {
      owner.close();

      return;
    }

    if (joined) {
      this.#state = { kind: "peer" };
      this.#options.logger.info("Joined the plugin bridge of another Claude Code session");

      return;
    }

    this.#state = {
      kind: "unavailable",
      closeCode: owner.lastCloseCode,
    };
    this.#retryLater();
  }

  /** The owner's session ended: this process takes the port over, or joins whichever process did. */
  #ownerLost(): void {
    this.#state = {
      kind: "unavailable",
      closeCode: null,
    };
    this.#options.logger.info("The plugin bridge's owner went away; taking over or joining the next owner");
    this.#retryLater();
  }

  /** Jittered, so the sessions left behind do not all try the same moment. */
  #retryLater(): void {
    if (this.#closed) {
      return;
    }

    clearTimeout(this.#retryTimer);
    this.#retryTimer = setTimeout(() => void this.#connect(), PEER_RETRY_MS * (0.5 + Math.random()));
    this.#retryTimer.unref();
  }
}
