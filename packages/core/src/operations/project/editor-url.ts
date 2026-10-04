import * as z from "zod";
import { defineOperation } from "../define.ts";

/**
 * The editor URL of the project, from its main branch: Framer opens a node with `?node=<id>` appended. Taken from the
 * API, never from FRAMER_PROJECT_URL; null when the project has no branching.
 */
export const projectEditorUrl = defineOperation({
  name: "project.editorUrl",
  effect: "read",
  idempotent: true,
  permissions: [],
  input: z.strictObject({}),
  output: z.object({ url: z.string().nullable() }),
  async run({ runtime }) {
    const main = await runtime.port.getBranch("main");

    return { url: main?.url ?? null };
  },
});
