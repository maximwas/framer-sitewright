/**
 * Panels come from newer code than a server still running an older build: the plugin window reloads with every build,
 * a Claude Code session keeps its process until reconnected. The first session started owns the plugin bridge.
 */
export const STALE_SERVER_HINT =
  "This sitewright server probably runs an older build than the panel. Run `pnpm build`, then reconnect every Claude Code session with /mcp, starting with the one opened first.";
