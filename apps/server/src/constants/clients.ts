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
