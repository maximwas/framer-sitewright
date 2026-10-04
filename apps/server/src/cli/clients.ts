import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { PRODUCT } from "@sitewright/core";
import { CURSOR_CONFIG_PATH } from "../constants/clients.ts";
import type { Invocation, McpClient } from "../types/cli.ts";
import { mergeMcpServer } from "../utils/mcp-config.ts";

/** The clients this machine seems to have: the `claude` command, Cursor's and Codex's folders. */
export function detectClients(homeDir: string): McpClient[] {
  const found: McpClient[] = [];

  if (spawnSync("claude", ["--version"], { stdio: "ignore" }).status === 0) {
    found.push("claude-code");
  }

  if (existsSync(join(homeDir, ".cursor"))) {
    found.push("cursor");
  }

  if (existsSync(join(homeDir, ".codex"))) {
    found.push("codex");
  }

  return found;
}

/**
 * Adds the server to Claude Code for every folder (`--scope user`). When one is there already, `replace` decides; the
 * old entry is removed first. Resolves with what happened, in words.
 */
export function addToClaudeCode(server: Invocation, replace: () => Promise<boolean>): Promise<string> {
  const add = () =>
    spawnSync("claude", ["mcp", "add", PRODUCT.packageName, "--scope", "user", "--", server.command, ...server.args], {
      encoding: "utf8",
    });

  return (async () => {
    let result = add();

    if (result.status !== 0 && /already exists/i.test(`${result.stderr}${result.stdout}`)) {
      if (!(await replace())) {
        return "Claude Code keeps the server it had.";
      }

      spawnSync("claude", ["mcp", "remove", PRODUCT.packageName, "--scope", "user"], { stdio: "ignore" });
      result = add();
    }

    if (result.status !== 0) {
      throw new Error(`claude mcp add failed: ${(result.stderr || result.stdout).trim()}`);
    }

    return "Added to Claude Code for every folder.";
  })();
}

/** Adds the server to Cursor's user config (~/.cursor/mcp.json); the old file is kept as mcp.json.bak. */
export async function addToCursor(server: Invocation, homeDir: string): Promise<string> {
  const file = join(homeDir, ...CURSOR_CONFIG_PATH);
  let current: unknown = null;

  if (existsSync(file)) {
    try {
      current = JSON.parse(await readFile(file, "utf8"));
    } catch {
      throw new Error(`${file} is not valid JSON, so it was left as it is.`);
    }
  }

  const { config, changed } = mergeMcpServer(current, PRODUCT.packageName, {
    command: server.command,
    args: [...server.args],
  });

  if (!changed) {
    return "Cursor has the server already.";
  }

  await mkdir(dirname(file), { recursive: true });

  if (current !== null) {
    await copyFile(file, `${file}.bak`);
  }

  await writeFile(file, `${JSON.stringify(config, null, 2)}\n`);

  return `Added to Cursor (${file}). Restart Cursor to load it.`;
}

/** What to add to Codex's config.toml: the wizard does not edit TOML. */
export function codexBlock(server: Invocation): string {
  const quoted = (value: string) => JSON.stringify(value);

  return [
    `[mcp_servers.${PRODUCT.packageName}]`,
    `command = ${quoted(server.command)}`,
    `args = [${server.args.map(quoted).join(", ")}]`,
  ].join("\n");
}

/** The mcpServers block other clients take. */
export function clientConfigBlock(server: Invocation): string {
  return JSON.stringify(
    {
      mcpServers: {
        [PRODUCT.packageName]: {
          command: server.command,
          args: server.args,
        },
      },
    },
    null,
    2,
  );
}
