import * as z from "zod";
import { AUDIT_SEVERITIES } from "../constants/layout-audit.ts";

/** One thing the layout audit found: where, what and how to fix it. */
export const AuditIssueSchema = z.object({
  rule: z.string(),
  severity: z.enum(AUDIT_SEVERITIES),
  nodeId: z.string(),
  nodeName: z.string().nullable(),
  message: z.string(),
  fix: z.string(),
});
