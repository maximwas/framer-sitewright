import * as z from "zod";
import { CapabilityProbeSchema } from "../../schemas/capabilities.ts";
import type { CapabilityProbe } from "../../types/capabilities.ts";
import { errorMessage } from "../../utils/errors.ts";
import { defineOperation } from "../define.ts";

/**
 * Checks what the project's plan allows without changing anything. Only branch access tells plans apart on a read:
 * on the sandbox (29.09.2026) redirects, locales and publish info read fine as well, so any other limit shows up
 * only as an error once a feature is used.
 */
export const projectCapabilities = defineOperation({
  name: "project.capabilities",
  effect: "read",
  idempotent: true,
  permissions: [],
  input: z.strictObject({}),
  output: CapabilityProbeSchema,
  async run({ runtime }): Promise<CapabilityProbe> {
    try {
      const main = await runtime.port.getBranch("main");

      return {
        branches: main === null ? "unavailable" : "available",
        detail: null,
      };
    } catch (error) {
      return {
        branches: "unknown",
        detail: `The branch check failed: ${errorMessage(error)}`,
      };
    }
  },
});
