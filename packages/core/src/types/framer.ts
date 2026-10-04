import type { FramerPort } from "./framer-port.ts";

/** Which page a DSL call works on; the current page when omitted. */
export interface PageScope {
  pagePath?: string;
}

/** A node to serialize as DSL, optionally limited in depth and attributes. */
export interface SerializeInput {
  id: string;
  depth?: number;
  attributeFilter?: readonly string[];
}

/** Several nodes to serialize at once; ids Framer does not find are skipped. */
export interface SerializeNodesInput {
  ids: readonly string[];
  depth?: number;
  attributeFilter?: readonly string[];
}

/** Structural port over `framer.agent` (Server API only). Grammar lives in the cached system prompt. */
export interface AgentPort {
  getSystemPrompt(): Promise<string>;
  applyChanges(dsl: string, options?: PageScope): Promise<unknown>;
  serialize(input: SerializeInput, options?: PageScope): Promise<unknown>;
  serializeNodes(input: SerializeNodesInput, options?: PageScope): Promise<unknown>;
  /** Nodes of the given DSL types across the whole project, as the DSL sees them. */
  getNodesOfTypes(input: { types: readonly string[] }, options?: PageScope): Promise<unknown>;
  /** Stock image candidates (Unsplash): `{ source, query, count, orientation?, width? }`. */
  queryImages(input: Record<string, unknown>): Promise<unknown>;
  /** Icon sets by group: `{ project, external, additional }`, each `{ id, displayName }[]`. */
  listIconSets(): Promise<unknown>;
  /** The exact icon names of one set. */
  readIcons(input: { iconSetId: string }): Promise<unknown>;
  readIconSetControls(input: { iconSetIds: string[] }): Promise<unknown>;
  /** Components by group: `{ project: { canvas, code }, external, additional }`. */
  listComponents(): Promise<unknown>;
  readComponentControls(input: { componentIds: string[] }): Promise<unknown>;
  /** Project queries, e.g. `{ type: "implementation-guide-from-index", name: "FAQ" }`: `{ results }`, one per query. */
  readProject(queries: Record<string, unknown>[], options?: PageScope): Promise<unknown>;
}

export type TransportKind = "server-api" | "plugin";

export interface ScreenshotOptions {
  format?: "png" | "jpeg";
  scale?: 0.5 | 1 | 1.5 | 2 | 3 | 4;
  /** Region of the node in CSS pixels, before scale. */
  clip?: { x: number; y: number; width: number; height: number };
}

export interface ScreenshotData {
  readonly data: Uint8Array;
  readonly mimeType: string;
}

export type ScreenshotFn = (nodeId: string, options?: ScreenshotOptions) => Promise<ScreenshotData>;

/** Everything an operation may use. One runtime lives as long as its connection (or plugin session). */
export interface FramerRuntime {
  readonly transport: TransportKind;
  readonly port: FramerPort;
  readonly agent: AgentPort | null;
  readonly screenshot: ScreenshotFn | null;
  /**
   * Added to DSL temp ids. Framer never accepts a temp id twice in a session, and a new Server API
   * connection may resume a warm session, so that transport salts ids per connection.
   */
  readonly tempIdSalt?: string;
}
