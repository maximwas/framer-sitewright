import type { TransportKind } from "./framer.ts";
import type {
  CollectionData,
  ColorStyleData,
  ComponentData,
  CustomCodeLocation,
  DesignPageData,
  FileBytes,
  FontData,
  ProjectInfoData,
  TextStyleData,
  WebPageData,
} from "./framer-port.ts";

export interface FakeAgentSession {
  readonly state: FakeFramerState;
  readonly nextId: (prefix: string) => string;
  /** Like Framer: a temp id stays bound to its node for the whole session and can never be added again. */
  readonly tempIds: Map<string, string>;
}

export type NodeAttributes = Readonly<Record<string, string>>;

export interface FakeRuntimeOptions {
  /** false gives a plugin-like runtime: no framer.agent and no screenshots. */
  withAgent?: boolean;
  transport?: TransportKind;
}

export type Mutable<T> = { -readonly [K in keyof T]: T[K] };

export type FakeColorStyle = Mutable<ColorStyleData>;

export type FakeTextStyle = Mutable<TextStyleData>;

/** The fake project: style arrays change as Plugin API calls and DSL commands run. */
export interface FakeFramerState {
  project: ProjectInfoData;
  colorStyles: FakeColorStyle[];
  textStyles: FakeTextStyle[];
  fonts: FontData[];
  /** Fonts uploaded to the project: getFonts() leaves them out, and the DSL swaps a weight they lack for the nearest. */
  projectFonts: FontData[];
  webPages: WebPageData[];
  designPages: DesignPageData[];
  components: ComponentData[];
  collections: CollectionData[];
  /** false plays a project without branches, i.e. on a plan below Pro. */
  branching: boolean;
  /** The home page's breakpoints, the primary first; the rest copy it. */
  breakpoints: FakeBreakpoint[];
  /** Every applyChanges call, in order. */
  appliedDsl: string[];
  serializedNodes: Record<string, unknown>;
  systemPrompt: string;
  /** Returned by the next applyChanges call instead of running it. */
  nextApplyResult: unknown;
  uploadedImages: { id: string; url: string; name: string | null }[];
  /** uploadFile calls: what Framer was asked to fetch. */
  uploadedFiles: { id: string; source: string | FileBytes; name: string | null }[];
  svgs: string[];
  /** Ids selected in the editor; addSVG selects what it inserts. */
  selection: string[];
  /** setParent calls, in order. */
  moves: { nodeId: string; parentId: string; index?: number }[];
  customCode: Record<CustomCodeLocation, { disabled: boolean; html: string | null }>;
  codeFiles: { id: string; name: string; path: string; content: string }[];
  /** What queryImages answers. */
  stockImages: unknown[];
  iconSets: FakeIconSet[];
  /** readComponentControls answers, by component id. */
  componentControls: Record<string, unknown>;
  /** Scopes whose variables the session cannot find yet: reading the scope node loads it, as in Framer. */
  unloadedScopes: string[];
  /** How many times the project was published. */
  publishes: number;
  /** Component instances' control values, by node id (getNode, setAttributes). */
  instanceControls: Record<string, Record<string, unknown>>;
}

export interface FakeBreakpoint {
  id: string;
  name: string;
  width: number;
}

export interface FakeIconSet {
  id: string;
  displayName: string;
  group: "project" | "external" | "additional";
  icons: string[];
  controls: unknown;
}
