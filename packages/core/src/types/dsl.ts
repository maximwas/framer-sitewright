import type * as z from "zod";
import type { DSL_VERBS } from "../constants/dsl.ts";
import type { DslIssueSchema, DslLintIssueSchema, DslResultSchema, SerializedNodeSchema } from "../schemas/dsl.ts";

export type DslValue = string | number | boolean | null;

export type DslAttributes = Readonly<Record<string, DslValue | undefined>>;

export type DslIssue = z.infer<typeof DslIssueSchema>;

export type DslLintIssue = z.infer<typeof DslLintIssueSchema>;

export type DslResult = z.infer<typeof DslResultSchema>;

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
