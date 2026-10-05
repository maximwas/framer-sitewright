import * as z from "zod";
import { FONT_STYLES, FONT_WEIGHTS } from "../constants/fonts.ts";
import {
  ACTIVITY_ACTORS,
  ACTIVITY_LAYERS,
  ACTIVITY_VIEWS,
  CHANGE_CATEGORIES,
  NODE_CHANGES,
  REVERT_OUTCOMES,
  UNDO_STEP_KINDS,
} from "../constants/history.ts";
import { TEXT_ALIGNMENTS, TEXT_DECORATIONS, TEXT_STYLE_TAGS, TEXT_TRANSFORMS } from "../constants/text-styles.ts";

export const ColorStyleStateSchema = z.object({
  path: z.string(),
  light: z.string(),
  dark: z.string().nullable(),
});

const BreakpointStateSchema = z.object({
  minWidth: z.number(),
  fontSize: z.string(),
  letterSpacing: z.string(),
  lineHeight: z.string(),
  paragraphSpacing: z.number(),
});

export const TextStyleStateSchema = z.object({
  path: z.string(),
  tag: z.enum(TEXT_STYLE_TAGS),
  font: z.object({
    family: z.string(),
    weight: z.literal(FONT_WEIGHTS).nullable(),
    style: z.enum(FONT_STYLES).nullable(),
  }),
  /**
   * A colour bound to a token keeps only the binding (value null): the token's own changes are not changes to the
   * style. An unbound colour keeps its value.
   */
  color: z.object({
    tokenId: z.string().nullable(),
    value: z.string().nullable(),
  }),
  fontSize: z.string(),
  lineHeight: z.string(),
  letterSpacing: z.string(),
  paragraphSpacing: z.number(),
  transform: z.enum(TEXT_TRANSFORMS),
  alignment: z.enum(TEXT_ALIGNMENTS),
  decoration: z.enum(TEXT_DECORATIONS),
  /** The Plugin API's minWidth of the style, which its breakpoints depend on (journals before the field: 0). */
  minWidth: z.number().default(0),
  breakpoints: z.array(BreakpointStateSchema),
});

/** A DSL attribute value as serialize() reports it; null clears an attribute. */
const DslAttributeValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

export const DslAttributeMapSchema = z.record(z.string(), DslAttributeValueSchema);

/** One node of a snapshot. A subtree is a list in pre-order: each node names its parent and its place there. */
export const NodeSnapshotSchema = z.object({
  id: z.string(),
  type: z.string(),
  name: z.string().nullable(),
  parentId: z.string(),
  index: z.number().int(),
  /** What serialize() reports beside `attributes` and `+Type` needs, e.g. an instance's `component`. */
  params: DslAttributeMapSchema,
  attributes: DslAttributeMapSchema,
  /** A replica variant, recreated with CREATE_VARIANT from this variant; its attributes are then overrides. */
  replicaOf: z.string().nullable(),
  /** "hover" or "pressed" for a gesture variant. */
  gesture: z.string().nullable(),
});

/** A canvas node as a DSL change left it, or found it. */
export const NodeStateSchema = z.object({
  parentId: z.string().nullable(),
  index: z.number().int().nullable(),
  /** For an update, the attributes it changed; for a created node, all of them. */
  attributes: DslAttributeMapSchema,
  /** A deleted subtree (the node first), or the blocks and runs of a rich text whose text changed. */
  nodes: z.array(NodeSnapshotSchema),
  /** Replica overrides in a deleted subtree: replica variant id → original node id → attributes. */
  overrides: z.record(z.string(), z.record(z.string(), DslAttributeMapSchema)),
});

/**
 * One change the AI made, as the state before and after it: `before: null` means the item was created,
 * `after: null` that it was deleted. Undo restores `before`, but only where the item still matches `after`.
 */
/**
 * A CMS item as undo writes it back: its slug, draft state and field values by field id in the shape addItems takes
 * (images and files by URL, enums by case id, references by item id). `path` names it in lists: "Blog/hello".
 */
export const CmsItemStateSchema = z.object({
  path: z.string(),
  collectionId: z.string(),
  slug: z.string(),
  draft: z.boolean(),
  fieldData: z.record(z.string(), z.unknown()),
});

export const UndoStepSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("cms-item"),
    id: z.string(),
    before: CmsItemStateSchema.nullable(),
    after: CmsItemStateSchema.nullable(),
  }),
  z.object({
    kind: z.literal("color-style"),
    id: z.string(),
    before: ColorStyleStateSchema.nullable(),
    after: ColorStyleStateSchema.nullable(),
  }),
  z.object({
    kind: z.literal("text-style"),
    id: z.string(),
    before: TextStyleStateSchema.nullable(),
    after: TextStyleStateSchema.nullable(),
  }),
  z.object({
    kind: z.literal("node"),
    id: z.string(),
    type: z.string(),
    name: z.string().nullable(),
    /** The page the DSL ran on; undo runs there too. */
    pagePath: z.string(),
    change: z.enum(NODE_CHANGES),
    before: NodeStateSchema.nullable(),
    after: NodeStateSchema.nullable(),
  }),
]);

/**
 * The undo steps one operation run recorded; `incomplete` says why a change may be missing. `remap` holds old id → new
 * id of items a revert recreated, kept even when the revert fails halfway.
 */
export const JournalSchema = z.object({
  steps: z.array(UndoStepSchema),
  incomplete: z.string().nullable(),
  remap: z.record(z.string(), z.string()).default({}),
});

/**
 * What a call read or made, for the panel: its subject in words ("Hero, depth 2"), a short result ("24 nodes"), nodes
 * to link to and images to preview. Never the result itself: no XML, no image bytes.
 */
export const ActivityDetailSchema = z.object({
  subject: z.string().nullable(),
  summary: z.string().nullable(),
  nodes: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
      }),
    )
    .default([]),
  images: z.array(z.string()).default([]),
});

/**
 * One line of the activity journal: a tool call the AI made, an undo or redo, a restore to a checkpoint, a checkpoint
 * itself, or a skill the AI activated ("Skill: <name>" as the title, the skill's file it read as the detail's subject).
 * Shared by the server (which keeps the journal) and every UI that shows it.
 */
export const ActivityEntrySchema = z.object({
  id: z.string(),
  seq: z.number().int(),
  at: z.string(),
  durationMs: z.number().int(),
  kind: z.enum(["operation", "undo", "redo", "restore", "checkpoint", "skill"]),
  /** Journals written before the field existed hold only the AI's calls. */
  actor: z.enum(ACTIVITY_ACTORS).default("ai"),
  tool: z.string().nullable(),
  operation: z.string().nullable(),
  effect: z.enum(["read", "write", "destructive"]).nullable(),
  transport: z.enum(["server-api", "plugin"]).nullable(),
  /** Plugin API, Server API or Framer agent (journals before the field: null). */
  layer: z.enum(ACTIVITY_LAYERS).nullable().default(null),
  project: z
    .object({
      id: z.string(),
      name: z.string(),
    })
    .nullable(),
  title: z.string(),
  outcome: z.enum(["ok", "partial", "failed"]),
  error: z.string().nullable(),
  /** What the entry changed, as undo steps; empty for reads and checkpoints. */
  steps: z.array(UndoStepSchema),
  /** Why the steps may miss a change, e.g. a DSL command the undo cannot reverse. */
  incomplete: z.string().nullable(),
  /** Entries this one reverts: an undo or restore reverts writes, a redo reverts an undo. */
  reverts: z.array(z.string()),
  /** Items a revert left alone because someone changed them after the AI (journals before the field: 0). */
  conflicts: z.number().int().default(0),
  /** Old id → new id of items this entry recreated; later undos follow the new ids. */
  remap: z.record(z.string(), z.string()),
  label: z.string().nullable(),
  /** What the call read or made (journals before the field: null). */
  detail: ActivityDetailSchema.nullable().default(null),
});

/** An item an entry changed, for links and chips in the UI. */
export const ActivityItemSchema = z.object({
  kind: z.enum(UNDO_STEP_KINDS),
  id: z.string(),
  path: z.string(),
  change: z.enum(["created", "updated", "deleted"]),
  /** A color token's light color, for a swatch; null for text styles. */
  swatch: z.string().nullable(),
  /** What was done to it (animations, colors…), first the one its chip is colored by. */
  categories: z.array(z.enum(CHANGE_CATEGORIES)).default([]),
});

/** An entry as lists show it: the title, what changed, and whether it can be undone or redone now. */
export const ActivitySummarySchema = z.object({
  id: z.string(),
  seq: z.number().int(),
  at: z.string(),
  kind: ActivityEntrySchema.shape.kind,
  actor: ActivityEntrySchema.shape.actor,
  /** read for what the AI only looked at; copies saved before the field: null. */
  effect: ActivityEntrySchema.shape.effect.default(null),
  title: z.string(),
  outcome: ActivityEntrySchema.shape.outcome,
  error: z.string().nullable(),
  tool: z.string().nullable(),
  layer: ActivityEntrySchema.shape.layer,
  changes: z.string(),
  /** What kinds of change the entry made, for badges: components, animations, text, colors, layout… */
  categories: z
    .array(
      z.object({
        category: z.enum(CHANGE_CATEGORIES),
        count: z.number().int(),
      }),
    )
    .default([]),
  items: z.array(ActivityItemSchema),
  /** A change still in effect that undo can revert. */
  undoable: z.boolean(),
  /** Reverted by a later undo or restore; redo brings it back. */
  undone: z.boolean(),
  /** An undo or restore still in effect that redo can reapply. */
  redoable: z.boolean(),
  /** Items a revert kept because they changed after the AI. */
  conflicts: z.number().int(),
  incomplete: z.string().nullable(),
  label: z.string().nullable(),
  detail: ActivityEntrySchema.shape.detail,
});

const RevertParamsShape = {
  dryRun: z.boolean().default(false),
  onConflict: z.enum(["skip", "force"]).default("skip"),
};

/** What the plugin UI (or another client) may ask the server's activity journal. */
export const ActivityCallSchema = z.discriminatedUnion("method", [
  z.object({
    method: z.literal("activity.list"),
    params: z.object({
      limit: z.number().int().min(1).max(200).default(50),
      show: z.enum(ACTIVITY_VIEWS).default("changes"),
      /** Another project's journal, by id, to look at; omitted: the project the plugin is open in. */
      project: z.string().min(1).exactOptional(),
    }),
  }),
  z.object({
    method: z.literal("activity.undo"),
    params: z.object({
      entryId: z.string().exactOptional(),
      andLater: z.boolean().default(false),
      ...RevertParamsShape,
    }),
  }),
  z.object({
    method: z.literal("activity.redo"),
    params: z.object({
      entryId: z.string().exactOptional(),
      ...RevertParamsShape,
    }),
  }),
  z.object({
    method: z.literal("activity.restore"),
    params: z.object({
      checkpointId: z.string(),
      ...RevertParamsShape,
    }),
  }),
  z.object({
    method: z.literal("activity.checkpoint"),
    params: z.object({ label: z.string().min(1).max(120) }),
  }),
  /** Starts the journal over: the changes stay in Framer but can no longer be undone; the old journal is archived. */
  z.object({
    method: z.literal("activity.clear"),
    params: z.object({}),
  }),
]);

export const EntryRefSchema = z.object({
  id: z.string(),
  seq: z.number().int(),
  title: z.string(),
});

/**
 * Added to the result of every operation tool: the call's own journal entry, and what the user did in the plugin
 * window (undo, redo, restore, checkpoints) since the AI's previous call, so the model knows its changes may be gone.
 */
export const ActivityNoteSchema = z.object({
  entry: EntryRefSchema.nullable(),
  userChanges: z.array(EntryRefSchema),
});

/** What undoing one step did; `newId` is the id of a recreated item, which later undos follow. */
export const RevertResultSchema = z.object({
  kind: z.enum(UNDO_STEP_KINDS),
  id: z.string(),
  /** A style's path, or a node's name (its type when it has none). */
  path: z.string(),
  outcome: z.enum(REVERT_OUTCOMES),
  newId: z.string().nullable(),
  /** What did not come back exactly, e.g. Framer refused an attribute of a recreated node. */
  note: z.string().nullable(),
});

/** What an undo, redo or restore did (or would do, on a dry run), step by step. */
export const RevertReportSchema = z.object({
  dryRun: z.boolean(),
  /** The entries it reverts. */
  reverted: z.array(EntryRefSchema),
  /** Its own journal entry; null on a dry run. */
  entry: EntryRefSchema.nullable(),
  results: z.array(RevertResultSchema),
  conflicts: z.number().int(),
});

/** A project that has a journal on this computer, for the page's project switch. */
export const JournalProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  /** When its journal last changed, ISO. */
  updatedAt: z.string(),
});

/** `projects.list`: the projects with a journal, newest first, and the one the plugin is open in. */
export const JournalProjectsSchema = z.object({
  projects: z.array(JournalProjectSchema),
  shown: z
    .object({
      id: z.string(),
      name: z.string(),
    })
    .nullable(),
});
