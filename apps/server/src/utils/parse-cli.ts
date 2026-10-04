import { SETTING_ITEMS } from "@sitewright/core";
import { CLI_ARGUMENTS, KEY_ACTIONS, SETTING_CHANGE, SETUP_OPTIONS } from "../constants/cli.ts";
import type { CliCommand, KeyAction } from "../types/cli.ts";

/** The command in `process.argv.slice(2)`: none starts the MCP server on stdio (or, in a terminal, the setup wizard). */
export function parseCliArgs(argv: readonly string[]): CliCommand {
  const [first, ...rest] = argv;

  if (first === undefined) {
    return { kind: "mcp" };
  }

  const command = CLI_ARGUMENTS[first];

  if (command === undefined) {
    return unknown(first);
  }

  if (command.kind === "key") {
    const [action = "add", ...extra] = rest;

    return !KEY_ACTIONS.has(action) || extra.length > 0
      ? unknown(KEY_ACTIONS.has(action) ? (extra[0] ?? action) : action)
      : {
          kind: "key",
          action: action as KeyAction,
        };
  }

  if (command.kind === "settings") {
    return settingsCommand(rest);
  }

  const allowed = command.kind === "setup" ? SETUP_OPTIONS : new Set<string>();
  const stray = rest.find((word) => !allowed.has(word));

  if (stray !== undefined) {
    return unknown(stray);
  }

  if (command.kind !== "setup") {
    return command;
  }

  return {
    kind: "setup",
    hooks: rest.includes("--hooks"),
    yes: rest.includes("--yes") || rest.includes("-y"),
    print: rest.includes("--print"),
  };
}

/** `settings`, `settings --print`, or `settings customCode=on pluginFirst=off`. */
function settingsCommand(words: readonly string[]): CliCommand {
  const changes: Record<string, boolean> = {};
  let print = false;

  for (const word of words) {
    const [, key, value] = SETTING_CHANGE.exec(word) ?? [];

    if (word === "--print") {
      print = true;
    } else if (key !== undefined && SETTING_ITEMS.some((item) => item.key === key)) {
      changes[key] = value === "on";
    } else {
      return unknown(word);
    }
  }

  return {
    kind: "settings",
    print,
    changes,
  };
}

function unknown(argument: string): CliCommand {
  return {
    kind: "unknown",
    argument,
  };
}
