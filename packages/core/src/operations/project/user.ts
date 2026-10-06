import * as z from "zod";
import { OperationError } from "../../errors.ts";
import { defineOperation } from "../define.ts";

export const currentUser = defineOperation({
  name: "project.currentUser",
  effect: "read",
  idempotent: true,
  permissions: [],
  input: z.strictObject({}),
  output: z.object({
    name: z.string(),
    initials: z.string().nullable(),
    avatarUrl: z.string().nullable(),
  }),
  async run({ runtime }) {
    if (runtime.port.getCurrentUser === undefined) {
      throw new OperationError("UNSUPPORTED_TRANSPORT", "This connection cannot tell who is signed in to Framer.");
    }

    const user = await runtime.port.getCurrentUser();

    return {
      name: user.name,
      initials: user.initials ?? null,
      avatarUrl: user.avatarUrl ?? null,
    };
  },
  describe(_input, { name }) {
    return { subject: name };
  },
});
