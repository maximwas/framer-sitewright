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

/** An enum field's case; renaming one keeps the items set to it. */
export interface CmsEnumCaseHandle {
  readonly id: string;
  readonly name: string;
  setAttributes(attributes: { name?: string }): Promise<unknown>;
  remove(): Promise<void>;
}

/**
 * A CMS field as getFields lists it: an enum has its cases, a reference field the collection it points at, a List
 * (array) its nested fields. setAttributes renames it and keeps its values.
 */
export interface CmsFieldData {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly cases?: readonly CmsEnumCaseHandle[];
  readonly collectionId?: string;
  readonly fields?: readonly CmsFieldData[];
  setAttributes(attributes: { name?: string }): Promise<unknown>;
  /** Enum fields only. */
  addCase?(attributes: { name: string }): Promise<unknown>;
  /** Enum fields only: every case id, in the new order. */
  setCaseOrder?(caseIds: string[]): Promise<void>;
}

/** A value of a field nested in a List: Framer nests no enums, references or Lists. */
export type CmsListItemFieldInput =
  | { readonly type: "string"; readonly value: string }
  | { readonly type: "formattedText"; readonly value: string; readonly contentType?: "auto" | "markdown" | "html" }
  | { readonly type: "number"; readonly value: number }
  | { readonly type: "boolean"; readonly value: boolean }
  | { readonly type: "date"; readonly value: string | null }
  | { readonly type: "image"; readonly value: string | null; readonly alt?: string }
  | { readonly type: "link" | "file" | "color"; readonly value: string | null };

/** One entry of a List: values by nested field id; fields left out are cleared. */
export interface CmsListItemInput {
  fieldData: Record<string, CmsListItemFieldInput>;
}

/** A field value as Framer takes it: its field's type and the value in that type's shape. */
export type CmsFieldInput =
  | CmsListItemFieldInput
  | { readonly type: "enum"; readonly value: string }
  | { readonly type: "collectionReference"; readonly value: string | null }
  | { readonly type: "multiCollectionReference"; readonly value: readonly string[] | null }
  /** The whole List in order: entries left out are removed. */
  | { readonly type: "array"; readonly value: CmsListItemInput[] };

/** What addItems and setAttributes take for an item: field values by field id. */
export interface CmsItemWrite {
  id?: string;
  slug?: string;
  draft?: boolean;
  fieldData?: Record<string, CmsFieldInput>;
}

export interface CmsItemHandle {
  readonly id: string;
  readonly slug: string;
  readonly draft: boolean;
  readonly fieldData: Readonly<Record<string, { readonly type: string; readonly value: unknown }>>;
  setAttributes(update: CmsItemWrite): Promise<CmsItemHandle | null>;
  remove(): Promise<void>;
}

/** A field to add inside a List. */
export type CmsListItemFieldCreate =
  | {
      type: "string" | "formattedText" | "number" | "boolean" | "date" | "link" | "image" | "color";
      name: string;
    }
  | { type: "file"; name: string; allowedFileTypes: string[] };

/** A field to add: an enum lists its cases, a reference names the collection it points at, a List its fields. */
export type CmsFieldCreate =
  | CmsListItemFieldCreate
  | { type: "enum"; name: string; cases: { name: string }[] }
  | { type: "collectionReference" | "multiCollectionReference"; name: string; collectionId: string }
  | { type: "array"; name: string; fields: CmsListItemFieldCreate[] };

/** A CMS collection with its fields and items; managed ones belong to a sync plugin and refuse edits. */
export interface CollectionHandle extends CollectionData {
  readonly readonly: boolean;
  readonly managedBy: string;
  getFields(): Promise<readonly CmsFieldData[]>;
  addFields(fields: CmsFieldCreate[]): Promise<unknown>;
  removeFields(fieldIds: string[]): Promise<void>;
  setFieldOrder(fieldIds: string[]): Promise<void>;
  getItems(): Promise<readonly CmsItemHandle[]>;
  addItems(items: CmsItemWrite[]): Promise<void>;
  removeItems(itemIds: string[]): Promise<void>;
  setItemOrder(itemIds: string[]): Promise<void>;
}

export interface LocaleData {
  readonly id: string;
  /** BCP 47 code, e.g. "en-US" or "nl". */
  readonly code: string;
  readonly name: string;
  /** The URL segment, e.g. "nl". */
  readonly slug: string;
  readonly fallbackLocaleId?: string;
}

/** A translatable value: the text in the default locale and its translations by locale id. */
export interface LocalizationSourceData {
  readonly id: string;
  readonly type: string;
  readonly value: string;
  readonly valueByLocale: Readonly<Record<string, { readonly value: string | null; readonly status: string }>>;
}

/** The translatable values of one page, CMS item, component or the site settings. */
export interface LocalizationGroupData {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly sources: readonly LocalizationSourceData[];
  readonly statusByLocale: Readonly<Record<string, "excluded" | "ready">>;
}

export type LocalizedValueUpdate = { action: "set"; value: string; needsReview?: boolean } | { action: "clear" };

export interface LocalizationUpdate {
  valuesBySource?: Record<string, Record<string, LocalizedValueUpdate>>;
  statusByLocaleByGroup?: Record<string, Record<string, "excluded" | "ready">>;
}

export interface LocalizationWriteResult {
  readonly valuesBySource: {
    readonly errors: readonly { readonly sourceId: string; readonly localeId: string | null; readonly error: string }[];
  };
  readonly statusByLocaleByGroup: {
    readonly errors: readonly { readonly groupId: string; readonly error: string }[];
  };
}

/** A redirect: from a path on the site to another path or a URL; null `to` sends to the home page. */
export interface RedirectData {
  readonly id: string;
  readonly from: string;
  readonly to: string | null;
  readonly expandToAllLocales: boolean;
}

/** A redirect to add (no id) or to change (its id). */
export type RedirectWrite =
  | { from: string; to: string; expandToAllLocales: boolean }
  | { id: string; from?: string; to?: string; expandToAllLocales?: boolean };

/** One published version of the site: production or staging. */
export interface PublishData {
  readonly url: string;
  readonly deploymentTime: number;
  readonly optimizationStatus: string;
}

export interface PublishInfoData {
  readonly production: PublishData | null;
  readonly staging: PublishData | null;
}

/** A web page changed since the last publish. */
export interface UnpublishedChangeData {
  readonly nodeId: string;
  readonly path: string;
  readonly status: string;
}

export interface DeploymentData {
  readonly id: string;
  readonly status: string;
  readonly createdAt: string;
  readonly failureStage?: string;
  readonly deployedBy: { readonly name?: string | null } | null;
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

/** A file's content, as uploadFile takes a local file. */
export interface FileBytes {
  readonly bytes: Uint8Array<ArrayBuffer>;
  readonly mimeType: string;
}

/** An uploaded file: the url goes into a File control (a video's source) or a link. */
export interface FileAssetInfo {
  readonly id: string;
  readonly url: string;
  readonly extension: string | null;
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
  getCollections(): Promise<readonly CollectionHandle[]>;
  createCollection(name: string): Promise<CollectionHandle>;
  createWebPage(pagePath: string): Promise<WebPageData>;
  createDesignPage(pageName: string): Promise<DesignPageData>;
  getRedirects(): Promise<readonly RedirectData[]>;
  addRedirects(redirects: RedirectWrite[]): Promise<readonly RedirectData[]>;
  removeRedirects(redirectIds: string[]): Promise<void>;
  setRedirectOrder(redirectIds: string[]): Promise<void>;
  getPublishInfo(): Promise<PublishInfoData>;
  /** Alpha: the pages changed since the last publish. */
  getUnpublishedPageChanges?(): Promise<readonly UnpublishedChangeData[]>;
  /** Alpha: the newest deployments first. */
  listDeployments?(limit?: number): AsyncIterable<DeploymentData>;
  getLocales(): Promise<readonly LocaleData[]>;
  getDefaultLocale(): Promise<LocaleData>;
  getLocalizationGroups(): Promise<readonly LocalizationGroupData[]>;
  setLocalizationData(update: LocalizationUpdate): Promise<LocalizationWriteResult>;
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
  /** Any file (a video, a PDF, a font): an https URL Framer fetches, or the file's bytes (Framer fetches no data URL). */
  uploadFile(file: { file: string | FileBytes; name?: string }): Promise<FileAssetInfo>;
  /**
   * Inserts an instance of a component by its module URL (framer.com/m/…); returns the instance node. Without parentId
   * (alpha) Framer puts it where the editor's selection is.
   */
  addComponentInstance(options: { url: string; parentId?: string }): Promise<unknown>;
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
