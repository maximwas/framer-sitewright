import * as z from "zod";

/**
 * framer.agent.publish({ action: "preview" }) as Framer answers it (06.10.2026): `{ status: "ready", publishTarget,
 * stagingEnabled, errors, warnings, changes: [{ type, nodeId, name, status }], changesCount, urls, confirmationHash }`.
 * Loose, so a field Framer adds or drops later does not fail the preview.
 */
export const AgentPublishPreviewSchema = z.looseObject({
  status: z.string().default("unknown"),
  publishTarget: z.string().nullish(),
  stagingEnabled: z.boolean().nullish(),
  errors: z.array(z.unknown()).default([]),
  warnings: z.array(z.unknown()).default([]),
  changes: z
    .array(
      z.looseObject({
        type: z.string().default("unknown"),
        nodeId: z.string().nullish(),
        name: z.string().nullish(),
        status: z.string().default("changed"),
      }),
    )
    .default([]),
  changesCount: z.number().int().nullish(),
  urls: z.record(z.string(), z.unknown()).default({}),
});

/** A problem the preview found: what it says, and the layer it is on when Framer names one. */
export const PublishIssueSchema = z.object({
  message: z.string(),
  nodeId: z.string().nullable(),
});

export const PublishChangeSchema = z.object({
  /** WebPage, SmartComponent, … as Framer names it. */
  type: z.string(),
  name: z.string().nullable(),
  /** added, updated or removed. */
  status: z.string(),
  /** A web page's path; null for anything else. */
  path: z.string().nullable(),
});
