import * as z from "zod";
import { AuditIssueSchema } from "./layout-audit.ts";

const IssueMapSchema = z.record(z.string(), z.array(z.unknown()));

export const RawDslResultSchema = z.looseObject({
  message: z.string().optional(),
  errors: IssueMapSchema.optional(),
  warnings: IssueMapSchema.optional(),
  parseErrors: z.unknown().optional(),
  linter: z
    .looseObject({
      errors: IssueMapSchema.optional(),
      warnings: IssueMapSchema.optional(),
    })
    .optional(),
  renamedIds: z.record(z.string(), z.string()).optional(),
});

export const DslIssueSchema = z.object({
  message: z.string(),
  targets: z.array(z.string()),
});

export const DslLintIssueSchema = z.object({
  message: z.string(),
  severity: z.enum(["error", "warning"]),
  details: z.array(z.unknown()),
});

export const DslResultSchema = z.object({
  ok: z.boolean(),
  message: z.string(),
  errors: z.array(DslIssueSchema),
  warnings: z.array(DslIssueSchema),
  lint: z.array(DslLintIssueSchema),
  renamedIds: z.record(z.string(), z.string()),
});

/** design_apply's answer: Framer's diagnostics, plus for XML the real id of every `key`, and the DSL if it failed. */
export const DesignApplyResultSchema = DslResultSchema.extend({
  keys: z.record(z.string(), z.string()).exactOptional(),
  dsl: z.string().exactOptional(),
  /** Layout issues in what the batch touched (layout_audit's checks); the batch is applied either way. */
  audit: z.array(AuditIssueSchema).exactOptional(),
});

/**
 * A node as framer.agent.serialize() reports it: metadata ($-keys), `attributes`, creation parameters at the top level
 * (an instance's `component`, a token's `light`) and, depth permitting, `children`.
 */
export const SerializedNodeSchema = z.looseObject({
  type: z.string(),
  id: z.string(),
  name: z.string().optional(),
  $parentId: z.string().optional(),
  $groundNodeId: z.string().optional(),
  $scopeId: z.string().optional(),
  $isPrimary: z.boolean().optional(),
  $isReplica: z.boolean().optional(),
  $originalId: z.string().optional(),
  $gesture: z.string().optional(),
  $inheritsFrom: z.string().optional(),
  $truncated: z.boolean().optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
  children: z.array(z.unknown()).optional(),
});

/** The variables a scope node (a component, a page, a collection) declares, as serialize() lists them. */
export const SerializedVariablesSchema = z.array(
  z.looseObject({
    id: z.string(),
    name: z.string(),
  }),
);
