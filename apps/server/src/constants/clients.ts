import type { McpClient } from "../types/cli.ts";

/** The clients the setup wizard offers, and how it names them. */
export const MCP_CLIENTS: readonly { readonly value: McpClient; readonly label: string }[] = [
  {
    value: "claude-code",
    label: "Claude Code",
  },
  {
    value: "cursor",
    label: "Cursor",
  },
  {
    value: "codex",
    label: "Codex",
  },
  {
    value: "other",
    label: "Another MCP client",
  },
];

/** Cursor's user-wide MCP config. */
export const CURSOR_CONFIG_PATH = [".cursor", "mcp.json"] as const;

/** Codex's config, where the wizard only shows what to add (TOML is edited by hand). */
export const CODEX_CONFIG_PATH = [".codex", "config.toml"] as const;

/**
 * The browser MCP server the wizard offers: it lets the agent open the published site in a real browser to check what
 * a screenshot cannot show (menus, section links, hover, motion).
 */
export const BROWSER_SERVER = {
  name: "playwright",
  command: "npx",
  args: ["@playwright/mcp@latest"],
} as const;

/** A client's server list or config mentions a browser server when it names Playwright. */
export const BROWSER_SERVER_PATTERN = /playwright/i;
