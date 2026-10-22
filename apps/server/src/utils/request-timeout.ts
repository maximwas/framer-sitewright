import { REQUEST_TIMEOUT_MS, REQUEST_TIMEOUT_PER_MIB_MS } from "../constants/bridge.ts";

/** How long the plugin has to answer a request with this input: the base time, and more for a large one (an upload). */
export function requestTimeoutMs(input: unknown): number {
  const bytes = Buffer.byteLength(JSON.stringify(input ?? null));

  return REQUEST_TIMEOUT_MS + Math.ceil((bytes / 1024 ** 2) * REQUEST_TIMEOUT_PER_MIB_MS);
}
