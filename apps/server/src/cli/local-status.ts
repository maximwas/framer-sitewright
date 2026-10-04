import { LOCAL_STATUS_PATH, type LocalStatus, LocalStatusSchema } from "@sitewright/core";
import { readBridgePort } from "../bridge/bridge-config.ts";
import { DEFAULT_BRIDGE_PORT } from "../constants/bridge.ts";
import { OPEN_PROBE_TIMEOUT_MS } from "../constants/cli.ts";

/** What the running server knows about the plugin: its project and editor link; null when no server answers. */
export async function fetchLocalStatus(bridgeFile: string): Promise<LocalStatus | null> {
  const port = readBridgePort(bridgeFile) ?? DEFAULT_BRIDGE_PORT;

  try {
    const response = await fetch(`http://127.0.0.1:${port}${LOCAL_STATUS_PATH}`, {
      signal: AbortSignal.timeout(OPEN_PROBE_TIMEOUT_MS),
    });

    return response.ok ? LocalStatusSchema.parse(await response.json()) : null;
  } catch {
    return null;
  }
}
