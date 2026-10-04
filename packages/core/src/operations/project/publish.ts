import * as z from "zod";
import { defineOperation } from "../define.ts";

/**
 * Publishes the site as it is in the editor. It goes live for visitors, so the agent publishes only when the user asks.
 * Framer answers at once with the deployment's first status; optimization goes on after it.
 */
export const projectPublish = defineOperation({
  name: "project.publish",
  effect: "write",
  idempotent: false,
  permissions: ["publish"],
  input: z.strictObject({}),
  output: z.object({
    deploymentId: z.string(),
    /** pending, optimizing, ready or failed, as Framer first reports it. */
    status: z.string(),
    /** The address visitors see the site at, or null when Framer named none. */
    url: z.string().nullable(),
    hostnames: z.array(
      z.object({
        hostname: z.string(),
        type: z.string(),
        isPrimary: z.boolean(),
        isPublished: z.boolean(),
      }),
    ),
  }),
  async run({ runtime, history }) {
    const { deployment, hostnames } = await runtime.port.publish();
    const primary = hostnames.find((hostname) => hostname.isPrimary) ?? hostnames[0];

    history?.markIncomplete("Published: undo cannot unpublish; publish again after undoing a change.");

    return {
      deploymentId: deployment.id,
      status:
        deployment.failureStage === undefined ? deployment.status : `${deployment.status} (${deployment.failureStage})`,
      url: primary === undefined ? null : `https://${primary.hostname}`,
      hostnames: hostnames.map(({ hostname, type, isPrimary, isPublished }) => ({
        hostname,
        type,
        isPrimary,
        isPublished,
      })),
    };
  },
  describe(_input, { url, status }) {
    return {
      subject: url,
      summary: status,
    };
  },
});
