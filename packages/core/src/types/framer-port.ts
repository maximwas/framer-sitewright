import type { CUSTOM_CODE_LOCATIONS } from "../constants/assets.ts";
// Structural port over the part of the Framer API that core uses. Both `framer-api` (`Framer`) and
// `@framer/plugin` (`framer`) must be assignable to it; the adapters check this at compile time.
// Rules: core never imports either package; methods use method syntax; values returned here are opaque
// handles, never destructure their methods. Method syntax makes parameters bivariant, so value types
// mirror Framer's literal unions exactly: a wider type here would let invalid values compile.

export type FontWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;

export type FontStyle = "normal" | "italic";

export type TextStyleTag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p";

export type TextTransform = "none" | "inherit" | "capitalize" | "uppercase" | "lowercase";

export type TextAlignment = "left" | "center" | "right" | "justify";

export type TextDecoration = "none" | "underline" | "line-through";

export interface ProjectInfoData {
  readonly id: string;
  readonly name: string;
}

export interface ColorStyleData {
  readonly id: string;
  readonly name: string;
  readonly path: string;
  readonly light: string;
  readonly dark: string | null;
}

export interface FontData {
  readonly selector: string;
  readonly family: string;
  readonly weight: FontWeight | null;
  readonly style: FontStyle | null;
}

export interface TextStyleBreakpointData {
  readonly minWidth: number;
  readonly fontSize: string;
  readonly letterSpacing: string;
  readonly lineHeight: string;
  readonly paragraphSpacing: number;
}

export interface TextStyleData {
  readonly id: string;
  readonly name: string;
  readonly path: string;
  readonly tag: TextStyleTag;
  readonly font: FontData;
  readonly color: ColorStyleData | string;
  readonly transform: TextTransform;
  readonly alignment: TextAlignment;
  readonly decoration: TextDecoration;
  readonly balance: boolean;
  readonly minWidth: number;
  readonly fontSize: string;
  readonly letterSpacing: string;
  readonly lineHeight: string;
  readonly paragraphSpacing: number;
  readonly breakpoints: readonly TextStyleBreakpointData[];
}

export interface WebPageData {
  readonly id: string;
  readonly path: string | null;
  readonly draft: boolean;
  readonly collectionId: string | null;
}

export interface DesignPageData {
  readonly id: string;
  readonly name: string | null;
}

export interface ComponentData {
  readonly id: string;
  readonly name: string | null;
  readonly componentName: string | null;
}

export interface CollectionData {
  readonly id: string;
  readonly name: string;
}

export interface BranchData {
  readonly id: string;
  readonly title: string;
  /** The editor URL that opens this branch. */
  readonly url: string;
}

/** Framer's AssetPath: a full path in either `name` ("Brand/Primary") or `path`, never both. */
export type AssetLocator = { name?: string; path?: never } | { name?: never; path?: string };

export type ColorStyleCreate = { light: string; dark?: string | null } & AssetLocator;

export type ColorStyleUpdate = { light?: string; dark?: string | null } & AssetLocator;

export interface ColorStyleHandle extends ColorStyleData {
  setAttributes(update: ColorStyleUpdate): Promise<ColorStyleHandle | null>;
  remove(): Promise<void>;
}

export interface TextStyleBreakpointWrite {
  minWidth: number;
  fontSize?: string;
  letterSpacing?: string;
  lineHeight?: string;
  paragraphSpacing?: number;
}

/** Plugin API text style attributes. `font` and `color` must be handles returned by this port. */
export type TextStyleWrite = TextStyleFields & AssetLocator;

export interface TextStyleFields {
  /** Where the narrowest slot starts; the Plugin API files breakpoints shifted by one (see slotsOf). */
  minWidth?: number;
  tag?: TextStyleTag;
  font?: FontData;
  color?: ColorStyleData | string;
  transform?: TextTransform;
  alignment?: TextAlignment;
  decoration?: TextDecoration;
  balance?: boolean;
  fontSize?: string;
  lineHeight?: string;
  letterSpacing?: string;
  paragraphSpacing?: number;
  breakpoints?: readonly TextStyleBreakpointWrite[];
}

export interface TextStyleHandle extends TextStyleData {
  setAttributes(update: TextStyleWrite): Promise<TextStyleHandle | null>;
  remove(): Promise<void>;
}

export type CustomCodeLocation = (typeof CUSTOM_CODE_LOCATIONS)[number];

/** An uploaded image: the url goes into a `fill` (or a favicon), the id names the asset. */
export interface ImageAssetInfo {
  readonly id: string;
  readonly url: string;
}

/** A node on the canvas. A page's breakpoints are frames that say so, with their width ("1440px"). */
export interface CanvasNodeData {
  readonly id: string;
  readonly name?: string | null;
  readonly isBreakpoint?: boolean;
  /** The breakpoint the others replicate (Desktop); the rest are replicas of it. */
  readonly isPrimaryBreakpoint?: boolean;
  readonly width?: string | null;
}

/** A code file of the project: a code component or override lives in one. */
export interface CodeFileHandle {
  readonly id: string;
  readonly name: string;
  readonly path: string;
  readonly content: string;
  readonly exports: readonly { readonly name: string; readonly type: string }[];
  setFileContent(code: string): Promise<CodeFileHandle>;
  remove(): Promise<void>;
}

/** What publish() reports: the new deployment (its status right away, optimization goes on) and where it is live. */
export interface PublishResultData {
  readonly deployment: {
    readonly id: string;
    readonly status: string;
    readonly failureStage?: string;
  };
  readonly hostnames: readonly {
    readonly hostname: string;
    readonly type: string;
    readonly isPrimary: boolean;
    readonly isPublished: boolean;
  }[];
}

/** A component instance as setAttributes sees it: control values by name, code components' objects included. */
export interface ControlledNode {
  readonly id: string;
  readonly name?: string | null;
  readonly controls: Readonly<Record<string, unknown>>;
  setAttributes(update: { controls: Record<string, unknown> }): Promise<unknown>;
}

export interface FramerPort {
  getProjectInfo(): Promise<ProjectInfoData>;
  getColorStyles(): Promise<readonly ColorStyleHandle[]>;
  createColorStyle(attributes: ColorStyleCreate): Promise<ColorStyleHandle>;
  getTextStyles(): Promise<readonly TextStyleHandle[]>;
  createTextStyle(attributes: TextStyleWrite): Promise<TextStyleHandle>;
  getFonts(): Promise<readonly FontData[]>;
  getFont(family: string, attributes?: { weight?: FontWeight; style?: FontStyle }): Promise<FontData | null>;
  getNodesWithType(type: "WebPageNode"): Promise<readonly WebPageData[]>;
  getNodesWithType(type: "DesignPageNode"): Promise<readonly DesignPageData[]>;
  getNodesWithType(type: "ComponentNode"): Promise<readonly ComponentData[]>;
  getCollections(): Promise<readonly CollectionData[]>;
  getChildren(nodeId: string): Promise<readonly CanvasNodeData[]>;
  /** Any canvas node, or null; the caller narrows it (isControlledNode for a component instance). */
  getNode(nodeId: string): Promise<unknown>;
  /** The node's parent, or null. */
  getParent(nodeId: string): Promise<unknown>;
  /**
   * Plugin API node writes, which the Server API has too: pages built without framer.agent. Attributes are the Plugin
   * API's (see PLUGIN_ATTRIBUTE_RULES); each returns the node, or null.
   */
  createFrameNode(attributes: Record<string, unknown>, parentId?: string): Promise<unknown>;
  /** `@alpha` in @framer/plugin 5.1: missing from its types, present at runtime; public in framer-api. */
  createTextNode?(attributes: Record<string, unknown>, parentId?: string): Promise<unknown>;
  setAttributes(nodeId: string, attributes: Record<string, unknown>): Promise<unknown>;
  /** null when the project has no branching: a plan below Pro, or a project from before branching. */
  getBranch(branchId: string): Promise<BranchData | null>;
  /** Removes nodes, web pages too (the DSL cannot delete a page). */
  removeNodes(nodeIds: string[]): Promise<void>;
  /** `image`: an https URL or a data URL. */
  uploadImage(image: { image: string; name?: string; altText?: string }): Promise<ImageAssetInfo>;
  /** Inserts an SVG as a vector layer (the plugin); the Server API refuses it ("Failed to optimize SVG"). */
  addSVG(svg: { svg: string; name?: string }): Promise<void>;
  /** The layers selected in the editor. Only the plugin has a selection; the Server API lacks the method. */
  getSelection?(): Promise<readonly { readonly id: string; readonly name?: string | null }[]>;
  setParent(nodeId: string, parentId: string, index?: number): Promise<void>;
  getCustomCode(): Promise<
    Readonly<Record<CustomCodeLocation, { readonly disabled: boolean; readonly html: string | null }>>
  >;
  setCustomCode(options: { html: string | null; location: CustomCodeLocation }): Promise<void>;
  getCodeFiles(): Promise<readonly CodeFileHandle[]>;
  createCodeFile(name: string, code: string): Promise<CodeFileHandle>;
  /** Publishes the project as it is: to staging when the project has it on, else to production. */
  publish(): Promise<PublishResultData>;
}
