import { setupCommands } from "@sitewright/core";

/** How to connect the server to Claude Code and to other MCP clients, as text for the terminal. */
export function setupInstructions(packageName: string): string {
  const commands = setupCommands(packageName);

  return [
    "Easiest: the setup wizard asks everything (clients, project keys, skill hooks):",
    `  ${commands.wizard}`,
    "",
    "Or by hand. Claude Code:",
    `  ${commands.claudeCode}`,
    "",
    "Show the skills Claude uses in the journal (Claude Code hooks):",
    `  ${commands.skillHooks}`,
    "",
    "Add a project's key later (several projects, one key each):",
    `  ${commands.addKey}`,
    "",
    "Cursor, Codex and other MCP clients:",
    "```json",
    JSON.stringify(commands.clientConfig, null, 2),
    "```",
  ].join("\n");
}
