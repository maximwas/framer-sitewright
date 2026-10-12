import { CloseCode } from "@sitewright/core";
import type { LinkStatus } from "../types/link.ts";

/**
 * Whether the MCP server needs an update: it is older than this plugin, which Framer updates by itself, or its bridge
 * speaks another protocol. `serverVersion` is null when only the protocol tells.
 */
export function serverUpdate(status: LinkStatus, pluginVersion: string): { serverVersion: string | null } | null {
  if (status.state === "stopped" && status.closeCode === CloseCode.VersionMismatch) {
    return { serverVersion: null };
  }

  return status.state === "connected" && status.serverVersion !== null && isOlder(status.serverVersion, pluginVersion)
    ? { serverVersion: status.serverVersion }
    : null;
}

/** Whether version `a` comes before `b`, part by part (1.0.9 before 1.0.10). */
function isOlder(a: string, b: string): boolean {
  const parts = (version: string) => version.split(".").map((part) => Number.parseInt(part, 10) || 0);
  const [left, right] = [parts(a), parts(b)];

  for (let index = 0; index < Math.max(left.length, right.length); index++) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);

    if (difference !== 0) {
      return difference < 0;
    }
  }

  return false;
}
