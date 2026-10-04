import type { HistoryRecorder, Operation, PluginInfo, TransportKind } from "@sitewright/core";
import type { Framer } from "framer-api";
import type * as z from "zod";
import type { KeyStore } from "../keys/key-store.ts";
import type {
  ProjectRefSchema,
  RouterStatusSchema,
  SavedProjectSchema,
  TransportModeSchema,
  TransportStatusSchema,
} from "../schemas/transports.ts";
import type { TransportRouter } from "../transports/router.ts";
import type { ServerApiTransport } from "../transports/server-api/transport.ts";
import type { CallHandler } from "./bridge.ts";
import type { StoredProject } from "./keys.ts";
import type { Logger } from "./logging.ts";

/**
 * Where the plugin bridge stands. `listening`: this process owns the port. `peer`: another sitewright process (another
 * Claude Code session) owns it, and this one joined it. `unavailable`: the port is taken but its owner could not be
 * joined yet (`closeCode` says why, if it answered); retried in the background. Each state has its own hint.
 */
export type BridgeState =
  | { readonly kind: "listening" }
  | { readonly kind: "peer" }
  | { readonly kind: "unavailable"; readonly closeCode: number | null }
  | { readonly kind: "disabled" }
  | { readonly kind: "failed"; readonly reason: string };

export interface PluginTransportOptions {
  /** Without any Server API key, hints also say how to set one up. */
  readonly serverApiConfigured: () => boolean;
  readonly logger: Logger;
  /** The local app's port (bridge.json), or null when the bridge is off or broken. */
  readonly localAppPort: number | null;
}

export type TransportMode = z.infer<typeof TransportModeSchema>;

export type ProjectRef = z.infer<typeof ProjectRefSchema>;

export type SavedProject = z.infer<typeof SavedProjectSchema>;

export type TransportStatus = z.infer<typeof TransportStatusSchema>;

/** The local app's side channel: calls from its journal panels, and events pushed to them and to the plugin. */
export interface PluginUiChannel {
  /** Answers calls from the local app's journal panels with `handler`; a rejection goes back as the call's error. */
  servePanels(handler: CallHandler): void;
  /** Pushes an event to the plugin (e.g. editor.reveal) and to every journal panel. */
  notify(name: string, data: unknown): void;
  /** The local app (journal and bridge window) while this process owns the bridge or has joined its owner. */
  localAppUrl(): string | null;
  /** A plugin is connected, so events reach it. */
  isConnected(): boolean;
  /** The connected plugin, or null: its project and editor link. */
  pluginInfo(): PluginInfo | null;
}

export interface OperationRunOptions {
  /** Collects the undo steps of a journaled call; the transport fills it wherever the operation runs. */
  readonly history?: HistoryRecorder;
  /** Learns how the call reached Framer, for the journal's layer badge. */
  readonly trace?: CallTrace;
}

/** Filled in while a call runs: whether it called framer.agent (the DSL), which makes it a Framer agent call. */
export interface CallTrace {
  usedAgent: boolean;
}

/** One way to reach Framer. Operations run wherever the `framer` object lives: here (Server API) or in the plugin. */
export interface FramerTransport {
  readonly kind: TransportKind;
  status(): TransportStatus;
  run<I extends z.ZodObject, O extends z.ZodObject>(
    operation: Operation<I, O>,
    input: unknown,
    options?: OperationRunOptions,
  ): Promise<z.output<O>>;
  close(): Promise<void>;
}

export type RouterStatus = z.infer<typeof RouterStatusSchema>;

export interface ServerApiOptions {
  /** Refuse when the active plugin edits another project than the Server API opens: the result would mislead. */
  readonly sameProjectAsActive?: boolean;
}

export type ConnectFn = (projectUrl: string, apiKey: string) => Promise<Framer>;

export interface ServerApiPoolOptions {
  /** The Server API of FRAMER_API_KEY and FRAMER_PROJECT_URL, or null. */
  readonly env: ServerApiTransport | null;
  /** The keys saved per project (keys.json), or null without them. */
  readonly keys: KeyStore | null;
  /** A Server API transport for a saved project. */
  readonly create: (project: StoredProject) => ServerApiTransport;
}

export interface ServerApiSessionOptions {
  readonly projectUrl: string;
  readonly apiKey: string;
  readonly logger: Logger;
  readonly connectFn?: ConnectFn;
  readonly maxAttempts?: number;
  readonly retryDelayMs?: number;
  readonly sleep?: (ms: number) => Promise<void>;
}

export interface RunOptions {
  /**
   * Run the call again on a fresh connection when the session is lost midway. Safe only when a repeat cannot
   * apply a change twice: reads, and writes that re-read the project first (operation.idempotent).
   */
  readonly replay: boolean;
}

/** What services need from the transports: run an operation on the active one, and read their status. */
export type OperationRunner = Pick<TransportRouter, "run" | "status" | "routeOf">;
