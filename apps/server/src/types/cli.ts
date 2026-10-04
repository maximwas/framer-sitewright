/** What the command line asks for. */
export type CliCommand =
  | { kind: "mcp" }
  | { kind: "setup"; hooks: boolean; yes: boolean; print: boolean }
  | { kind: "key"; action: KeyAction }
  | { kind: "settings"; print: boolean; changes: Readonly<Record<string, boolean>> }
  | { kind: "hook" }
  | { kind: "open" }
  | { kind: "logs" }
  | { kind: "version" }
  | { kind: "help" }
  | { kind: "unknown"; argument: string };

/** `sitewright key [add|list|remove]`. */
export type KeyAction = "add" | "list" | "remove";

/** A command the first word names; `setup` and `key` read their options from the words after it. */
export type NamedCommand =
  | Exclude<CliCommand, { kind: "mcp" | "unknown" | "setup" | "key" | "settings" }>
  | { kind: "setup" }
  | { kind: "key" }
  | { kind: "settings" };

/** A command line: the program and its arguments. */
export interface Invocation {
  readonly command: string;
  readonly args: readonly string[];
}

/** An MCP client the setup wizard can connect. */
export type McpClient = "claude-code" | "cursor" | "codex" | "other";
