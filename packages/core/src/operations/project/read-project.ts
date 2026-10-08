import * as z from "zod";
import { requireAgent } from "../../framer/runtime.ts";
import { defineOperation } from "../define.ts";

export const framerRead = defineOperation({
  name: "project.readProject",
  effect: "read",
  idempotent: true,
  permissions: [],
  needsAgent: true,
  input: z.strictObject({
    queries: z
      .array(z.looseObject({ type: z.string().min(1) }))
      .min(1)
      .max(10)
      .describe(
        'readProject queries as framer_docs section "essentials" lists them, e.g. { type: "font-search", query: "Inter" }.',
      ),
    pagePath: z.string().startsWith("/").exactOptional(),
  }),
  output: z.object({ result: z.unknown() }),
  async run({ runtime }, { queries, pagePath }) {
    return {
      result: await requireAgent(runtime).readProject(queries, pagePath === undefined ? undefined : { pagePath }),
    };
  },
  describe({ queries }) {
    return { subject: queries.map(({ type }) => type).join(", ") };
  },
});
