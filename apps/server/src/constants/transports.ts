import { LOCAL_APP_PORT, PRODUCT } from "@sitewright/core";

export const SERVER_API_SETUP_HINT = `Add this project's Server API key (Framer: Site Settings → General → API Keys): in the journal page (Settings), or \`npx ${PRODUCT.packageName} key\` in a terminal.`;

export const OPEN_PLUGIN_HINT = `Open the ${PRODUCT.pluginTitle} plugin in the Framer editor and click Connect: it opens the bridge window (http://127.0.0.1:${LOCAL_APP_PORT}), which must stay open while the plugin works.`;

export const UNAVAILABLE_HINT =
  "Another sitewright process (another Claude Code session) owns the plugin bridge and could not be joined yet; this server keeps trying every second.";

export const PEER_VERSION_HINT =
  "Another Claude Code session runs a different sitewright build and owns the plugin bridge. Run `pnpm build`, then reconnect that session with /mcp, so every session runs the same version.";

export const DISABLED_HINT = "The plugin bridge is disabled (SITEWRIGHT_PLUGIN_BRIDGE=off).";

export const USE_SERVER_API_HINT = `Or use the Server API: ${SERVER_API_SETUP_HINT}`;

/**
 * After the Server API failed to tell its project, the router does not ask again for this long: a bad key or a down
 * network would otherwise cost every call routed to the plugin a failed connect.
 */
export const LEARN_PROJECT_COOLDOWN_MS = 30_000;

/** Operations after which the Server API session is reopened: they change what its project snapshot lists (code). */
export const SERVER_API_STALE_AFTER: ReadonlySet<string> = new Set(["codeFiles.write", "codeFiles.delete"]);
