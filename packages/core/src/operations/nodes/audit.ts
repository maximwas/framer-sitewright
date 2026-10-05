import * as z from "zod";
import { NODE_TYPE_LABELS } from "../../constants/history.ts";
import { LAYOUT_AUDIT_DEPTH } from "../../constants/layout-audit.ts";
import { OperationError } from "../../errors.ts";
import { auditContext, auditTree } from "../../layout-audit/audit.ts";
import { AuditIssueSchema } from "../../schemas/layout-audit.ts";
import { countOf } from "../../utils/text.ts";
import { defineOperation } from "../define.ts";
import { pageRootId, readNodeTree } from "./read-tree.ts";

export const layoutAudit = defineOperation({
  name: "layout.audit",
  effect: "read",
  idempotent: true,
  permissions: [],
  input: z.strictObject({
    pagePath: z.string().startsWith("/").default("/").describe('Page to audit, e.g. "/" or "/about".'),
    nodeId: z
      .string()
      .min(1)
      .exactOptional()
      .describe("Audit only this node and its children; omit for the whole page with its breakpoints."),
  }),
  output: z.object({
    pagePath: z.string(),
    /** What was audited, by name: the page, or the layer of nodeId. */
    target: z.string(),
    issues: z.array(AuditIssueSchema),
    summary: z.string(),
  }),
  async run({ runtime }, { pagePath, nodeId }) {
    const id = nodeId ?? (await pageRootId(runtime, pagePath));
    const [tree, context] = await Promise.all([
      readNodeTree(runtime, id, LAYOUT_AUDIT_DEPTH, pagePath),
      auditContext(runtime.port),
    ]);

    if (tree === null) {
      throw new OperationError("NOT_FOUND", `Node "${id}" was not found on page ${pagePath}.`, "Read the page first.");
    }

    const issues = auditTree(tree, context);
    const defects = issues.filter((found) => found.severity === "defect").length;

    return {
      pagePath,
      target: nodeId === undefined ? `Page ${pagePath}` : (tree.name ?? NODE_TYPE_LABELS[tree.type] ?? tree.type),
      issues,
      summary:
        issues.length === 0
          ? "No layout issues found."
          : `${countOf(issues.length, "issue")}, ${countOf(defects, "visible defect")}: fix the defects first.`,
    };
  },
  describe(_input, { target, issues }) {
    return {
      subject: target,
      summary: countOf(issues.length, "issue"),
    };
  },
});
