import {
  ActivityCallSchema,
  KeySetParamsSchema,
  McpSettingsPatchSchema,
  OperationError,
  RevealParamsSchema,
} from "@sitewright/core";
import * as z from "zod";
import { STALE_SERVER_HINT } from "../constants/ui-api.ts";
import { handleActivityCall } from "../history/activity-api.ts";
import type { UiServices } from "../types/ui-api.ts";
import { keyStatus, removeKey, saveKey } from "./project-keys.ts";

/**
 * One call from a journal panel of the local app. Whatever a panel does, the user did. Async all the way, so invalid
 * params reject instead of throwing into the transport.
 */
export async function handleUiCall(method: string, params: unknown, services: UiServices): Promise<unknown> {
  switch (method) {
    case "capabilities.get":
      return services.capabilities.current();
    case "editor.reveal":
      return services.editor.reveal(parseCall(RevealParamsSchema, method, params ?? {}).id);
    case "settings.get":
      return services.settings.get();
    case "settings.set":
      return services.settings.set(parseCall(McpSettingsPatchSchema, method, params ?? {}));
    case "keys.get":
      return keyStatus(services);
    case "keys.set":
      return saveKey(services, parseCall(KeySetParamsSchema, method, params ?? {}));
    case "keys.remove":
      return removeKey(services);
    default:
      return handleActivityCall(
        parseCall(ActivityCallSchema, method, {
          method,
          params: params ?? {},
        }),
        services.journal,
        services.undo,
        "user",
        services.shownProject?.() ?? undefined,
      );
  }
}

/** A call this server cannot parse fails in words the panel's toast can show, not as zod's JSON. */
function parseCall<T>(schema: z.ZodType<T>, method: string, value: unknown): T {
  const parsed = schema.safeParse(value);

  if (parsed.success) {
    return parsed.data;
  }

  const unknownMethod = parsed.error.issues.some((issue) => issue.path[0] === "method");

  throw new OperationError(
    "INVALID_INPUT",
    unknownMethod
      ? `This sitewright server does not know "${method}".`
      : `Invalid params for "${method}": ${z.prettifyError(parsed.error)}`,
    STALE_SERVER_HINT,
  );
}
