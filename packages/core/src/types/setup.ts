/** How to connect the MCP server, as the terminal (`setup`) and the plugin show it. */
export interface SetupCommands {
  /** The setup wizard: connects the clients, adds project keys, the skill hooks. */
  readonly wizard: string;
  /** Adds a project's Server API key from a terminal. */
  readonly addKey: string;
  /** Adds the server to Claude Code; it then works through the plugin. */
  readonly claudeCode: string;
  /** Installs the hooks that show the skills Claude uses in the journal. */
  readonly skillHooks: string;
  /** The `mcpServers` block for Cursor, Codex and other MCP clients. */
  readonly clientConfig: Readonly<Record<string, unknown>>;
}
