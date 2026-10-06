import type * as z from "zod";
import { KEY_SETUP_HINT } from "../constants/product.ts";
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
      'via "dsl" needs the project\'s Server API key.',
      `Use via "plugin-api", or add the key. ${KEY_SETUP_HINT}`,
    );
  }

  return "dsl";
}
