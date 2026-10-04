import { BridgeError } from "@sitewright/core";
import { ErrorCode, FramerAPIError } from "framer-api";

/**
 * Whether a failed call may still have changed the project: it timed out, or the plugin went away while running it.
 * The plugin records undo steps itself, so such a failure also loses them.
 */
export function outcomeUnknown(error: unknown): boolean {
  if (error instanceof BridgeError) {
    return error.code === "TIMEOUT" || error.code === "PLUGIN_DISCONNECTED";
  }

  return error instanceof FramerAPIError && error.code === ErrorCode.TIMEOUT;
}
