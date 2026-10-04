import type * as z from "zod";
import type { AUDIT_SEVERITIES } from "../constants/layout-audit.ts";
import type { AuditIssueSchema } from "../schemas/layout-audit.ts";
import type { SerializedNode } from "./dsl.ts";

export type AuditSeverity = (typeof AUDIT_SEVERITIES)[number];

export type AuditIssue = z.infer<typeof AuditIssueSchema>;

/** What the audit needs of a text style: how it aligns, cases and wraps text, and which heading it is. */
export interface AuditTextStyle {
  readonly tag: string;
  readonly alignment: string;
  readonly transform: string;
  readonly family: string | null;
  readonly balance: boolean;
}

/** The project facts the audit checks nodes against. */
export interface AuditContext {
  /** The text style a node's textStylePreset names (an id, a path or a name), or null. */
  readonly textStyle: (preset: unknown) => AuditTextStyle | null;
  /** Every text style of the project, for project-wide checks. */
  readonly textStyles: readonly AuditTextStyle[];
  /** Whether the project has color tokens to use instead of raw colors. */
  readonly hasTokens: boolean;
}

/** How a size behaves: fills the parent, hugs the content, is fixed, or relative to something else. */
export type SizeKind = "fill" | "fit" | "fixed" | "relative" | "unset";

/** A rule over one node and its children. */
export type NodeRule = (node: SerializedNode, context: AuditContext) => AuditIssue[];

/** A rule over a whole breakpoint frame. */
export type PageRule = (breakpoint: SerializedNode, context: AuditContext) => AuditIssue[];
