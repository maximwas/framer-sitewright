import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { addBrowserToCursor, addToCursor, hasBrowserServer } from "../src/cli/clients.ts";
import { mergeMcpServer } from "../src/utils/mcp-config.ts";
import { parseCliArgs } from "../src/utils/parse-cli.ts";
import { selfInvocation } from "../src/utils/self-invocation.ts";

it("adds the server to an MCP client's config once, keeping its other servers", () => {
  const entry = {
    command: "npx",
    args: ["-y", "sitewright@latest"],
  };
  const existing = {
    mcpServers: { other: { command: "other-mcp" } },
    theme: "dark",
  };
  const first = mergeMcpServer(existing, "sitewright", entry);

  expect(first).toEqual({
    config: {
      mcpServers: {
        other: { command: "other-mcp" },
        sitewright: entry,
      },
      theme: "dark",
    },
    changed: true,
  });
  expect(mergeMcpServer(first.config, "sitewright", entry).changed).toBe(false);
  expect(mergeMcpServer(null, "sitewright", entry).config).toEqual({ mcpServers: { sitewright: entry } });
  expect(() => mergeMcpServer([], "sitewright", entry)).toThrow();
});

it("regression: fills an empty Cursor config instead of calling it broken JSON", async () => {
  const home = await mkdtemp(join(tmpdir(), "sitewright-home-"));
  const file = join(home, ".cursor", "mcp.json");
  const server = {
    command: "/usr/local/bin/node",
    args: ["/opt/sitewright/dist/bin.mjs"],
  };

  await mkdir(join(home, ".cursor"));
  await writeFile(file, "");
  await addToCursor(server, home);

  expect(JSON.parse(await readFile(file, "utf8"))).toEqual({ mcpServers: { sitewright: server } });
});

it("runs itself the way it was started: through npx from npx's cache, otherwise from its own files", () => {
  expect(selfInvocation("/Users/me/.npm/_npx/1a2b/node_modules/sitewright/dist/bin.mjs", "/usr/bin/node")).toEqual({
    command: "npx",
    args: ["-y", "sitewright@latest"],
  });
  expect(selfInvocation("/opt/sitewright/dist/bin.mjs", "/usr/local/bin/node")).toEqual({
    command: "/usr/local/bin/node",
    args: ["/opt/sitewright/dist/bin.mjs"],
  });
});

it("knows the key commands", () => {
  expect(parseCliArgs(["key"])).toEqual({
    kind: "key",
    action: "add",
  });
  expect(parseCliArgs(["key", "list"])).toEqual({
    kind: "key",
    action: "list",
  });
  expect(parseCliArgs(["key", "remove"])).toEqual({
    kind: "key",
    action: "remove",
  });
  expect(parseCliArgs(["key", "nope"])).toEqual({
    kind: "unknown",
    argument: "nope",
  });
  expect(parseCliArgs(["setup", "--print"])).toMatchObject({
    kind: "setup",
    print: true,
  });
});

it("takes switches from a script, and refuses ones it does not know", () => {
  expect(parseCliArgs(["settings", "customCode=on", "pluginFirst=off"])).toEqual({
    kind: "settings",
    print: false,
    changes: {
      customCode: true,
      pluginFirst: false,
    },
  });
  expect(parseCliArgs(["settings", "--print"])).toEqual({
    kind: "settings",
    print: true,
    changes: {},
  });
  expect(parseCliArgs(["settings", "magic=on"])).toEqual({
    kind: "unknown",
    argument: "magic=on",
  });
});

it("offers the Playwright MCP only to clients that do not have a browser server yet", async () => {
  const home = await mkdtemp(join(tmpdir(), "sitewright-home-"));

  await mkdir(join(home, ".cursor"), { recursive: true });
  await writeFile(join(home, ".cursor", "mcp.json"), JSON.stringify({ mcpServers: { other: { command: "x" } } }));
  await mkdir(join(home, ".codex"), { recursive: true });
  await writeFile(join(home, ".codex", "config.toml"), '[mcp_servers.playwright]\ncommand = "npx"\n');

  expect(hasBrowserServer("cursor", home)).toBe(false);
  expect(hasBrowserServer("codex", home)).toBe(true);
  expect(await addBrowserToCursor(home)).toContain("Added");
  expect(hasBrowserServer("cursor", home)).toBe(true);
  expect(JSON.parse(await readFile(join(home, ".cursor", "mcp.json"), "utf8")).mcpServers.other).toEqual({
    command: "x",
  });
});
