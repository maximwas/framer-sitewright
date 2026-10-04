import type { NamedCommand } from "../types/cli.ts";

/** Every word the command line accepts first, and what it means. */
export const CLI_ARGUMENTS: Readonly<Record<string, NamedCommand>> = {
  setup: { kind: "setup" },
  key: { kind: "key" },
  settings: { kind: "settings" },
  hook: { kind: "hook" },
  open: { kind: "open" },
  logs: { kind: "logs" },
  version: { kind: "version" },
  "--version": { kind: "version" },
  "-v": { kind: "version" },
  help: { kind: "help" },
  "--help": { kind: "help" },
  "-h": { kind: "help" },
};

/** The options `setup` takes. */
export const SETUP_OPTIONS: ReadonlySet<string> = new Set(["--hooks", "--yes", "-y", "--print"]);

/** `settings name=on|off`: a switch set from a script. */
export const SETTING_CHANGE = /^(\w+)=(on|off)$/;

/** What `key` does: add a project's key (the default), list them, or remove one. */
export const KEY_ACTIONS: ReadonlySet<string> = new Set(["add", "list", "remove"]);

/** The oldest Node.js the bundle runs on (`engines` in package.json says the same). */
export const MINIMUM_NODE_VERSION = "24.11.0";

/** How each system opens a link in the default browser. */
export const BROWSER_OPENERS: Readonly<Partial<Record<NodeJS.Platform, readonly string[]>>> = {
  darwin: ["open"],
  win32: ["cmd", "/c", "start", ""],
};

/** Elsewhere (Linux, BSD). */
export const DEFAULT_BROWSER_OPENER: readonly string[] = ["xdg-open"];

/** How long `open` waits for the local app to answer before it says no server runs. */
export const OPEN_PROBE_TIMEOUT_MS = 1_000;
