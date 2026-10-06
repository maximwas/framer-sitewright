import * as z from "zod";
import { PUBLISH_PREVIEW } from "../../constants/publish.ts";
import { requireAgent } from "../../framer/runtime.ts";
import { AgentPublishPreviewSchema, PublishChangeSchema, PublishIssueSchema } from "../../schemas/publish.ts";
import { publishIssueOf } from "../../utils/publish.ts";
import { countOf } from "../../utils/text.ts";
import { defineOperation } from "../define.ts";

/**
 * What a publish would do, without publishing: Framer's preview of it (framer.agent.publish with action "preview").
 * Only the preview is ever asked for. Its confirmation hash stays out of the answer: the user publishes.
 */
export const publishPreview = defineOperation({
  name: "project.publishPreview",
  effect: "read",
  idempotent: true,
  permissions: [],
  needsAgent: true,
  input: z.strictObject({}),
  output: z.object({
    /** Framer's verdict, e.g. "ready". */
    status: z.string(),
    /** Blocking errors stop a publish until they are fixed. */
    blocked: z.boolean(),
    /** Where a publish would go: production, staging, or a branch's preview; null when Framer does not say. */
    target: z.string().nullable(),
    stagingEnabled: z.boolean().nullable(),
    errors: z.array(PublishIssueSchema),
    warnings: z.array(PublishIssueSchema),
    /** Pages, components and other parts changed since the last publish. */
    changes: z.array(PublishChangeSchema),
    totalChanges: z.number().int(),
    /** The site's addresses by target, e.g. { production: "https://….framer.app" }. */
    urls: z.record(z.string(), z.string()),
  }),
  async run({ runtime }) {
    const agent = requireAgent(runtime);
    const preview = AgentPublishPreviewSchema.parse(await agent.publish({ action: PUBLISH_PREVIEW }));
    const pages = await runtime.port.getNodesWithType("WebPageNode");
    const errors = preview.errors.map(publishIssueOf);

    return {
      status: preview.status,
      blocked: errors.length > 0 || preview.status === "blocked",
      target: preview.publishTarget ?? null,
      stagingEnabled: preview.stagingEnabled ?? null,
      errors,
      warnings: preview.warnings.map(publishIssueOf),
      changes: preview.changes.map(({ type, nodeId, name, status }) => ({
        type,
        name: name ?? null,
        status,
        path: pages.find((page) => page.id === nodeId)?.path ?? null,
      })),
      totalChanges: preview.changesCount ?? preview.changes.length,
      urls: Object.fromEntries(
        Object.entries(preview.urls).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
      ),
    };
  },
  describe(_input, { status, errors, warnings, totalChanges }) {
    return {
      subject: status,
      summary: [
        countOf(totalChanges, "change"),
        errors.length > 0 ? countOf(errors.length, "blocking error") : null,
        warnings.length > 0 ? countOf(warnings.length, "warning") : null,
      ]
        .filter((part) => part !== null)
        .join(", "),
    };
  },
});
