import type { BridgeError, PluginInfo, PluginToServer } from "@sitewright/core";
import type { WebSocket } from "ws";
import type * as z from "zod";
import type { PendingRequests } from "../bridge/pending-requests.ts";
import type { BridgeConfigSchema } from "../schemas/bridge.ts";
import type { OwnerToPeerSchema, PeerToOwnerSchema } from "../schemas/peer.ts";

export type BridgeConfig = z.infer<typeof BridgeConfigSchema>;

export type PeerToOwner = z.infer<typeof PeerToOwnerSchema>;

export type OwnerToPeer = z.infer<typeof OwnerToPeerSchema>;

/**
 * How this process reaches the plugin: as the bridge's owner (BridgeServer), or through the owner when another
 * sitewright process holds the port (OwnerClient). Operations, events and the plugin's status go the same way.
 */
export interface PluginLink {
  request(op: string, input: unknown, options?: { journal?: boolean }): Promise<unknown>;
  notify(name: string, data: unknown): void;
  /** The connected plugin, or null. */
  plugin(): PluginInfo | null;
}

export interface OwnerClientOptions {
  readonly port: number;
  readonly token: string;
  readonly log: BridgeLog;
}

export interface PeerConnectionOptions {
  readonly log: BridgeLog;
  /** Hands a peer's operation to the plugin. */
  readonly relay: (op: string, input: unknown, journal: boolean) => Promise<unknown>;
  /** Hands a peer's event to the plugin and the journal panels. */
  readonly forward: (name: string, data: unknown) => void;
  readonly plugin: () => PluginInfo | null;
  readonly onClose: () => void;
}

export interface BridgeConfigOptions {
  /** Where SITEWRIGHT_HOME and SITEWRIGHT_BRIDGE_PORT come from; default process.env. */
  readonly env?: Record<string, string | undefined>;
  /** Receives problems that do not stop the bridge; default console.warn. */
  readonly warn?: (message: string) => void;
}

export interface BridgeServerOptions {
  readonly port: number; // 0 = ephemeral (tests)
  readonly token: string; // from bridge.json; peers send it in the x-sitewright-token upgrade header
  /** The built web app this server hands out, or null when it is missing (pages then 404). */
  readonly webRoot: string | null;
  /** Plugin origins the bridge window relays for, exact match, e.g. ["https://localhost:5173"]. */
  readonly pluginOrigins: readonly string[];
  readonly serverVersion?: string;
  readonly log?: BridgeLog;
}

export type ResponseMessage = Extract<PluginToServer, { type: "response" }>;

export interface PendingRequest {
  readonly op: string;
  readonly resolve: (result: unknown) => void;
  readonly reject: (error: BridgeError) => void;
  readonly timer: ReturnType<typeof setTimeout>;
}

export type BridgeLog = (message: string, data?: Record<string, unknown>) => void;

/** Answers one call from a journal panel; a rejection goes back as the call's error. */
export type CallHandler = (method: string, params: unknown) => Promise<unknown>;

/** A plugin that completed the hello handshake. */
export interface PluginSession {
  readonly id: string;
  readonly info: PluginInfo;
  readonly socket: WebSocket;
  readonly pending: PendingRequests;
}

export interface PluginConnectionOptions {
  readonly serverVersion: string;
  readonly log: BridgeLog;
  /** The plugin said hello: the connection is a session now. */
  readonly onSession: (session: PluginSession) => void;
  /** A session's socket closed; its pending requests have failed already. */
  readonly onSessionClosed: (session: PluginSession, code: number) => void;
}

/** Why an upgrade was refused. The origin is safe to surface; the token never is. */
export interface UpgradeRejection {
  readonly reason: "host" | "origin" | "token";
  readonly origin: string | null;
}

export interface UpgradePolicy {
  readonly allowedHosts: ReadonlySet<string>;
  /** The local app's own origins: plugin and panel sockets come only from its pages. */
  readonly ownOrigins: ReadonlySet<string>;
  readonly token: string;
}

/** Who is upgrading: the plugin (relayed by the bridge window), another sitewright process, or the journal panel. */
export type UpgradeRole = "plugin" | "peer" | "panel";

export type UpgradeVerdict =
  | { readonly status: 101; readonly role: UpgradeRole }
  | { readonly status: 404 }
  | { readonly status: 403; readonly role: UpgradeRole; readonly rejection: UpgradeRejection };
