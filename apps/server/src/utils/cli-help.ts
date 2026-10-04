import { PRODUCT } from "@sitewright/core";

/** The text of `--help`. */
export function cliHelp(): string {
  return [
    `${PRODUCT.title}: an MCP server that lets AI agents build and edit Framer sites. Unofficial, not affiliated with Framer.`,
    "",
    `Usage: ${PRODUCT.packageName} [command]`,
    "",
    "  (no command)     in a terminal: the setup wizard; for MCP clients: the MCP server on stdio",
    "  setup            the setup wizard: connect clients, add project keys, the skill and its hooks",
    "  setup --print    print the commands and config blocks instead",
    "  key              add a project's Server API key (key list, key remove)",
    "  settings         what the agent may do (settings --print, settings customCode=on)",
    "  setup --hooks    show the Claude Code hooks that put the skills Claude uses into the journal;",
    "                   with --yes, add them to ~/.claude/settings.json",
    "  setup --skill    add the Sitewright skill to Claude Code (~/.claude/skills/sitewright)",
    "  open             open the journal page of the running server in the browser",
    "  logs             follow the logs of every running server on this machine",
    "  hook             (run by Claude Code) take a hook's input on stdin for the journal",
    "  --version, -v    print the version",
    "  --help, -h       print this help",
  ].join("\n");
}
