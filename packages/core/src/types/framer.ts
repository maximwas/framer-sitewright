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
  /**
   * Every descendant of a node with one of the given DSL types, as one flat list without their children (a rich text
   * still carries its blocks and runs, which the list also has on their own).
   */
  getDescendantsOfTypes(input: { id: string; types: readonly string[] }, options?: PageScope): Promise<unknown>;
  /** The style and token nodes of the given types that a node's descendants use, each once. */
  getDescendantReferencesOfTypes(
    input: { id: string; types: readonly string[] },
    options?: PageScope,
  ): Promise<unknown>;
  /**
   * Replaces every exact (case-sensitive) `searchText` in a text node, inside its runs, so bold, links and lists stay;
   * false when the text holds none. A match across runs takes the formatting of the run it starts in (06.10.2026).
   */
  replaceText(input: { id: string; searchText: string; replaceText: string }, options?: PageScope): Promise<boolean>;
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
  /** The project context Framer's own agent starts with: fonts, `<available-shaders>`, the site map… */
  getContext(): Promise<string>;
  /** Shader control definitions by shader name: `{ <name>: { <control>: … } }`. */
  readShaderControls(input: { shaderNames: readonly string[] }): Promise<unknown>;
  /** Project queries, e.g. `{ type: "implementation-guide-from-index", name: "FAQ" }`: `{ results }`, one per query. */
  readProject(queries: Record<string, unknown>[], options?: PageScope): Promise<unknown>;
  /**
   * The publish flow: `{ action: "preview" }` only reads what a publish would do. Sitewright never sends the other
   * actions (confirm_publish, deploy_to_production): the user publishes.
   */
  publish(input?: Record<string, unknown>): Promise<unknown>;
  /**
   * Copies an external instance's component (Marketplace, shared library) into the project and points the instance at
   * the copy: `{ status, message, component }` (ComponentAgentAnswerSchema). It finds the instance on any page.
   */
  makeExternalComponentLocal(input: { id: string; replaceAll?: boolean }, options?: PageScope): Promise<unknown>;
  /** Replaces a local component's instance with its layers: `{ status, replacementId }`. */
  flattenComponentInstance(input: { id: string }, options?: PageScope): Promise<unknown>;
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
/** A gradient as Framer's gradient classes take it: stop positions from 0 to 1, colors as CSS or a color token. */
export interface GradientSpec {
  readonly kind: "linear";
  /** CSS degrees: 0 points up, 90 right, 180 down. */
  readonly angle: number;
  readonly stops: readonly GradientStop[];
}

export interface GradientStop {
  readonly color: unknown;
  readonly position: number;
}

export interface FramerRuntime {
  readonly transport: TransportKind;
  readonly port: FramerPort;
  readonly agent: AgentPort | null;
  readonly screenshot: ScreenshotFn | null;
  /**
   * Builds a gradient fill for backgroundGradient from Framer's own gradient classes, which core cannot import; absent
   * where no package provides them (tests).
   */
  readonly createGradient?: (spec: GradientSpec) => unknown;
  /**
   * Added to DSL temp ids. Framer never accepts a temp id twice in a session, and a new Server API
   * connection may resume a warm session, so that transport salts ids per connection.
   */
  readonly tempIdSalt?: string;
}
