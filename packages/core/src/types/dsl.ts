import type * as z from "zod";
import type { DSL_VERBS } from "../constants/dsl.ts";
import type {
  DesignApplyResultSchema,
  DslIssueSchema,
  DslLintIssueSchema,
  DslResultSchema,
  SerializedNodeSchema,
} from "../schemas/dsl.ts";

export type DslValue = string | number | boolean | null;

export type DslAttributes = Readonly<Record<string, DslValue | undefined>>;

export type DslIssue = z.infer<typeof DslIssueSchema>;

export type DslLintIssue = z.infer<typeof DslLintIssueSchema>;

export type DslResult = z.infer<typeof DslResultSchema>;

/** What design_apply answers, as operations build it. */
export type DesignApplyResult = z.input<typeof DesignApplyResultSchema>;

/** ADD for `+Type`; UNKNOWN for a command the grammar does not have, or text that is not `key="value"`. */
export type DslVerb = "ADD" | (typeof DSL_VERBS)[number] | "UNKNOWN";

/** One parsed DSL command. */
export interface DslCommand {
  readonly verb: DslVerb;
  /** Node type of an ADD (`+FrameNode` → FrameNode), otherwise null. */
  readonly type: string | null;
  /** The target id; for ADD and CREATE_VARIANT the new node's temp id. */
  readonly id: string;
  readonly attributes: Readonly<Record<string, string>>;
  readonly raw: string;
}

export type SerializedNode = z.infer<typeof SerializedNodeSchema>;

/** A transition written as the spring Framer keeps on that attribute (design_apply reports them). */
export interface SpringConversion {
  readonly target: string;
  readonly attribute: string;
  readonly from: string;
  /** null: left out, where Framer keeps no spring. */
  readonly to: string | null;
}

/**
 * A write of a batch the DSL cannot make and the plugin can, done after the batch (see splitPluginWrites): a border
 * control per side, or an attribute back to its default. `nodeId` is as the batch names the node.
 */
export type PluginWrite =
  | { readonly kind: "control"; readonly nodeId: string; readonly control: string; readonly value: string }
  | { readonly kind: "reset"; readonly nodeId: string; readonly attribute: string };
