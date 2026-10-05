import * as z from "zod";
import { DEPLOYMENTS_LIMIT, DEPLOYMENTS_LIMIT_MAX } from "../../constants/nodes.ts";
import { OperationError } from "../../errors.ts";
import { PublishedSchema } from "../../schemas/site.ts";
import type { PublishData } from "../../types/framer-port.ts";
import { countOf } from "../../utils/text.ts";
import { defineOperation } from "../define.ts";

function published(publish: PublishData | null) {
  return publish === null
    ? null
    : {
        url: publish.url,
        publishedAt: new Date(publish.deploymentTime).toISOString(),
        optimization: publish.optimizationStatus,
      };
}

export const publishStatus = defineOperation({
  name: "project.publishStatus",
  effect: "read",
  idempotent: true,
  permissions: [],
  input: z.strictObject({}),
  output: z.object({
    production: PublishedSchema,
    staging: PublishedSchema,
    /** Web pages added, updated or removed since the last publish; null where Framer does not tell. */
    unpublished: z
      .array(
        z.object({
          path: z.string(),
          status: z.string(),
        }),
      )
      .nullable(),
  }),
  async run({ runtime }) {
    const { port } = runtime;
    const [info, changes] = await Promise.all([port.getPublishInfo(), port.getUnpublishedPageChanges?.() ?? null]);

    return {
      production: published(info.production),
      staging: published(info.staging),
      unpublished:
        changes === null
          ? null
          : changes.map(({ path, status }) => ({
              path,
              status,
            })),
    };
  },
  describe(_input, { production, unpublished }) {
    return {
      summary: [
        production === null ? "Not published" : `Published ${production.publishedAt.slice(0, 10)}`,
        unpublished === null ? null : `${countOf(unpublished.length, "page")} changed since`,
      ]
        .filter((part) => part !== null)
        .join(" · "),
    };
  },
});

export const deploymentsList = defineOperation({
  name: "project.deployments",
  effect: "read",
  idempotent: true,
  permissions: [],
  input: z.strictObject({
    limit: z.number().int().min(1).max(DEPLOYMENTS_LIMIT_MAX).default(DEPLOYMENTS_LIMIT),
  }),
  output: z.object({
    deployments: z.array(
      z.object({
        id: z.string(),
        status: z.string(),
        createdAt: z.string(),
        /** Where a failed deployment stopped. */
        failureStage: z.string().optional(),
        /** Who published it, when Framer still knows. */
        by: z.string().nullable(),
      }),
    ),
  }),
  async run({ runtime }, { limit }) {
    const list = runtime.port.listDeployments;

    if (list === undefined) {
      throw new OperationError("UNSUPPORTED_TRANSPORT", "This Framer runtime cannot list deployments.");
    }

    const deployments = [];

    for await (const deployment of list.call(runtime.port, limit)) {
      deployments.push({
        id: deployment.id,
        status: deployment.status,
        createdAt: deployment.createdAt,
        ...(deployment.failureStage === undefined ? {} : { failureStage: deployment.failureStage }),
        by: deployment.deployedBy?.name ?? null,
      });

      if (deployments.length >= limit) {
        break;
      }
    }

    return { deployments };
  },
  describe(_input, { deployments }) {
    return { summary: countOf(deployments.length, "deployment") };
  },
});
