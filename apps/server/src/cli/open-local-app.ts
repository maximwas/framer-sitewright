import { spawn } from "node:child_process";
import { BRIDGE_INFO_PATH } from "@sitewright/core";
import { readBridgePort } from "../bridge/bridge-config.ts";
import { DEFAULT_BRIDGE_PORT } from "../constants/bridge.ts";
import { BROWSER_OPENERS, DEFAULT_BROWSER_OPENER, OPEN_PROBE_TIMEOUT_MS } from "../constants/cli.ts";

/**
 * `open`: the journal page in the default browser. The page lives in the MCP server Claude Code runs, so without a
 * running server there is nothing to open: says so instead. Resolves with the text to print and whether it worked.
 */
export async function openLocalApp(bridgeFile: string): Promise<{ ok: boolean; message: string }> {
  const port = readBridgePort(bridgeFile) ?? DEFAULT_BRIDGE_PORT;
  const url = `http://127.0.0.1:${port}/`;
  const running = await fetch(new URL(BRIDGE_INFO_PATH, url), { signal: AbortSignal.timeout(OPEN_PROBE_TIMEOUT_MS) })
    .then((response) => response.ok)
    .catch(() => false);

  if (!running) {
    return {
      ok: false,
      message: `No server answers at ${url}. Start Claude Code with the MCP server connected (/mcp shows it), then run this again.`,
    };
  }

  const [command = "xdg-open", ...args] = BROWSER_OPENERS[process.platform] ?? DEFAULT_BROWSER_OPENER;

  spawn(command, [...args, url], {
    detached: true,
    stdio: "ignore",
  })
    .on("error", () => undefined)
    .unref();

  return {
    ok: true,
    message: `Opened ${url}`,
  };
}
