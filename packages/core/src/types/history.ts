import type * as z from "zod";
import type {
  ACTIVITY_ACTORS,
  ACTIVITY_LAYERS,
  ACTIVITY_VIEWS,
  CHANGE_CATEGORIES,
  REVERT_OUTCOMES,
} from "../constants/history.ts";
import type { HistoryRecorder } from "../history/recorder.ts";
import type {
  ActivityCallSchema,
  ActivityDetailSchema,
  ActivityEntrySchema,
  ActivityNoteSchema,
  ActivitySummarySchema,
  CmsItemStateSchema,
  ColorStyleStateSchema,
  DslAttributeMapSchema,
  EntryRefSchema,
  JournalProjectSchema,
  JournalProjectsSchema,
  JournalSchema,
  NodeSnapshotSchema,
  NodeStateSchema,
  RevertReportSchema,
  RevertResultSchema,
  TextStyleStateSchema,
  UndoStepSchema,
} from "../schemas/history.ts";
import type { SerializedNode } from "./dsl.ts";
import type { AgentPort, FramerRuntime } from "./framer.ts";
import type { ColorStyleHandle, TextStyleHandle } from "./framer-port.ts";

export type ColorStyleState = z.infer<typeof ColorStyleStateSchema>;

export type CmsItemState = z.infer<typeof CmsItemStateSchema>;

export type TextStyleState = z.infer<typeof TextStyleStateSchema>;

export type UndoStep = z.infer<typeof UndoStepSchema>;

export type Journal = z.infer<typeof JournalSchema>;

export type ActivityEntry = z.infer<typeof ActivityEntrySchema>;

export type ActivitySummary = z.infer<typeof ActivitySummarySchema>;

export type ActivityCall = z.infer<typeof ActivityCallSchema>;

export type JournalProject = z.infer<typeof JournalProjectSchema>;

export type JournalProjects = z.infer<typeof JournalProjectsSchema>;

export type RevertReport = z.infer<typeof RevertReportSchema>;

export type EntryRef = z.infer<typeof EntryRefSchema>;

export type ActivityNote = z.infer<typeof ActivityNoteSchema>;

export type ActivityActor = (typeof ACTIVITY_ACTORS)[number];

export type ActivityView = (typeof ACTIVITY_VIEWS)[number];

export type ActivityLayer = (typeof ACTIVITY_LAYERS)[number];

export type ActivityDetail = z.infer<typeof ActivityDetailSchema>;

export type DslAttributeMap = z.infer<typeof DslAttributeMapSchema>;

export type NodeSnapshot = z.infer<typeof NodeSnapshotSchema>;

export type NodeState = z.infer<typeof NodeStateSchema>;

export type NodeStep = Extract<UndoStep, { kind: "node" }>;

/** Style and CMS item steps; the Plugin API reverts them, one at a time. */
export type StyleStep = Exclude<UndoStep, { kind: "node" }>;

export type CmsItemStep = Extract<UndoStep, { kind: "cms-item" }>;

/** An item as the revert currently sees it; `handle` is null for items a dry run only pretends to create. */
export interface WorkingEntry<State, Handle> {
  id: string;
  path: string;
  state: State;
  handle: Handle | null;
}

/** How the journal's reverts stand (see revertState). */
export interface RevertState {
  /** Entries whose change is not in effect now. */
  readonly undone: ReadonlySet<string>;
  /** Entries a later entry reverts, even if that revert was undone since: only the newest link of a chain acts. */
  readonly superseded: ReadonlySet<string>;
}

export type RevertOutcome = (typeof REVERT_OUTCOMES)[number];

export type Decision<Entry> =
  | { readonly outcome: "deleted" | "restored"; readonly target: Entry }
  | { readonly outcome: "recreated" | "unchanged" | "gone" | "conflict" };

export interface StepStates<State> {
  readonly id: string;
  readonly before: State | null;
  readonly after: State | null;
}

export type ColorStep = Extract<UndoStep, { kind: "color-style" }>;

export type TextStep = Extract<UndoStep, { kind: "text-style" }>;

export type ColorEntry = WorkingEntry<ColorStyleState, ColorStyleHandle>;

export type TextEntry = WorkingEntry<TextStyleState, TextStyleHandle>;

export type RevertResult = z.infer<typeof RevertResultSchema>;

export interface RevertOptions {
  readonly force: boolean;
  readonly dryRun: boolean;
  /** Records what the revert changes, so it can be redone; node reverts record their DSL through it. */
  readonly history?: HistoryRecorder | undefined;
}

/** How the journal reads one kind of style and turns a change into an undo step. */
export interface StyleKind<S extends { readonly id: string; readonly path: string }, State> {
  read(runtime: FramerRuntime): Promise<readonly S[]>;
  state(style: S): State;
  step(id: string, before: State | null, after: State | null): UndoStep;
}

export interface StyleHistoryScope<S extends { readonly id: string; readonly path: string }, State> {
  readonly history: HistoryRecorder | undefined;
  readonly runtime: FramerRuntime;
  readonly kind: StyleKind<S, State>;
  /** The styles as read before the write, by canonical path. */
  readonly before: ReadonlyMap<string, S>;
  /** Canonical paths the write may touch. */
  readonly paths: readonly string[];
  /** Styles the write may remove, followed by id: a delete of same-named styles or of a whole folder. */
  readonly targets?: readonly S[];
  readonly dryRun?: boolean;
}

/** A node a DSL batch touches; see planCapture. */
export type CaptureTarget =
  | { readonly change: "created"; readonly id: string; readonly type: string | null }
  | { readonly change: "updated"; readonly id: string; readonly text: boolean }
  | { readonly change: "moved" | "deleted"; readonly id: string };

export interface DslCapture {
  /** In command order; each node once per change. A created target's id is its temp id. */
  readonly targets: readonly CaptureTarget[];
  /** Commands with verbs the history cannot undo. */
  readonly unsupported: readonly string[];
}

/** Where a node sits: its parent and its index among the parent's children. */
export interface NodePlacement {
  readonly parentId: string;
  readonly index: number;
}

/** A deleted node's subtree, with the overrides replica variants held for it. */
export interface DeletedSnapshot {
  readonly nodes: readonly NodeSnapshot[];
  readonly overrides: Readonly<Record<string, Readonly<Record<string, DslAttributeMap>>>>;
  /** The subtree was deeper than the snapshot reads. */
  readonly truncated: boolean;
}

/** The nodes a DSL batch touched, read before and after it (see withDslHistory). */
export interface DslSnapshots {
  readonly pagePath: string;
  readonly targets: readonly CaptureTarget[];
  readonly renamedIds: Readonly<Record<string, string>>;
  readonly before: BeforeSnapshots;
  readonly after: {
    readonly nodes: ReadonlyMap<string, SerializedNode>;
    readonly placements: ReadonlyMap<string, NodePlacement>;
  };
}

/** The touched nodes as they were: updated and moved ones, where they sat, and deleted subtrees. */
export interface BeforeSnapshots {
  readonly nodes: ReadonlyMap<string, SerializedNode>;
  readonly placements: ReadonlyMap<string, NodePlacement>;
  readonly deleted: ReadonlyMap<string, DeletedSnapshot>;
  /** Nodes to delete that were read but could not be placed, so they have no snapshot. */
  readonly unplaced: readonly string[];
}

export interface DslHistoryScope {
  readonly history: HistoryRecorder;
  readonly agent: AgentPort;
  readonly pagePath: string;
  readonly dsl: string;
  /** Ids among the batch's targets that are variables, not nodes: no node read finds them. */
  readonly variables?: ReadonlySet<string>;
}

export interface NodeRevertOptions {
  /** Overwrite nodes someone changed after the AI, instead of leaving them as conflicts. */
  readonly force: boolean;
  /** A fresh DSL temp id: Framer never accepts one twice in a session. */
  readonly nextTempId: () => string;
}

/** The nodes a revert plan starts from, as Framer has them now, and where the moved ones sit. */
export interface CurrentNodes {
  readonly nodes: ReadonlyMap<string, SerializedNode>;
  readonly placements: ReadonlyMap<string, NodePlacement>;
}

/** A node as a revert plan tracks it while it decides the steps; fields change as steps are decided. */
export interface WorkingNode {
  parentId: string | null;
  /** Its index among its parent's children, when it was read. */
  index: number | null;
  /** What a SET can change: attributes, top-level parameters and the name (see fieldsOf). */
  attributes: DslAttributeMap;
  /** A rich text's blocks and runs, and the ids of its top-level blocks (to delete them). */
  content: NodeSnapshot[];
  contentIds: string[];
}

export interface NodeDecision {
  readonly step: NodeStep;
  readonly outcome: RevertOutcome;
  readonly note: string | null;
  /** Ids (temp ids for recreated nodes) the step's commands name, to match Framer's errors to the step. */
  readonly targets: readonly string[];
}

/** A recreated node's override in a replica variant that exists already: set once the node has its real id. */
export interface PendingOverride {
  readonly replicaId: string;
  readonly tempId: string;
  readonly attributes: DslAttributeMap;
}

export interface NodeRevertPlan {
  /** One DSL batch, in order. */
  readonly commands: readonly string[];
  /** One per step, in the order given. */
  readonly decisions: readonly NodeDecision[];
  /** Original id → temp id of every node the batch recreates. */
  readonly recreated: ReadonlyMap<string, string>;
  readonly pendingOverrides: readonly PendingOverride[];
  /** Web pages to remove: the DSL cannot delete them. */
  readonly removePages: readonly string[];
}

/** Node steps of one page, in order. */
export interface PageSteps {
  readonly pagePath: string;
  readonly steps: NodeStep[];
}

/** A run of consecutive steps that one writer reverts: styles through the Plugin API, nodes through the DSL. */
export type StepSegment =
  | { readonly kind: "node"; readonly steps: NodeStep[] }
  | { readonly kind: "style"; readonly steps: StyleStep[] };

/** A kind of change for the panel's badges (components, animations, text…). */
export type ChangeCategory = (typeof CHANGE_CATEGORIES)[number];
