import * as z from "zod";
import { defineOperation } from "../define.ts";

/** The project's id and name: one cheap call, used to find the project's activity journal. */
export const projectInfo = defineOperation({
  name: "project.info",
  effect: "read",
  idempotent: true,
  permissions: [],
  input: z.strictObject({}),
  output: z.object({
    id: z.string(),
    name: z.string(),
  }),
  async run({ runtime }) {
    const { id, name } = await runtime.port.getProjectInfo();

    return {
      id,
      name,
    };
  },
});
