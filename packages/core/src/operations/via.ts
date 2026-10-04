import type * as z from "zod";
import { OperationError } from "../errors.ts";
import type { ViaSchema } from "../schemas/operations.ts";
import type { FramerRuntime } from "../types/framer.ts";
import type { Via } from "../types/operations.ts";

export function resolveVia(runtime: FramerRuntime, requested: z.output<typeof ViaSchema>): Via {
  if (requested === "plugin-api") {
    return "plugin-api";
  }

  if (requested === "auto") {
    return runtime.agent === null ? "plugin-api" : "dsl";
  }

  if (runtime.agent === null) {
    throw new OperationError(
      "UNSUPPORTED_TRANSPORT",
      `via "dsl" needs framer.agent, which the ${runtime.transport} transport does not provide.`,
      'Use via "plugin-api" or the Server API transport.',
    );
  }

  return "dsl";
}
