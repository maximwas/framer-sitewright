import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { hookCommand } from "../src/utils/hook-command.ts";
import { nodeVersionProblem } from "../src/utils/node-version.ts";
import { parseCliArgs } from "../src/utils/parse-cli.ts";
import { setupInstructions } from "../src/utils/setup-instructions.ts";

describe("parseCliArgs", () => {
  it("runs the MCP server without arguments", () => {
    expect(parseCliArgs([])).toEqual({ kind: "mcp" });
  });

  it("knows every command and its aliases", () => {
    expect(parseCliArgs(["setup"])).toEqual({
      kind: "setup",
      hooks: false,
      skill: false,
      yes: false,
      print: false,
    });
    expect(parseCliArgs(["setup", "--hooks", "--yes"])).toEqual({
      kind: "setup",
      hooks: true,
      skill: false,
      yes: true,
      print: false,
    });
    expect(parseCliArgs(["hook"])).toEqual({ kind: "hook" });
    expect(parseCliArgs(["open"])).toEqual({ kind: "open" });
    expect(parseCliArgs(["logs"])).toEqual({ kind: "logs" });
    expect(parseCliArgs(["--version"])).toEqual({ kind: "version" });
    expect(parseCliArgs(["-v"])).toEqual({ kind: "version" });
    expect(parseCliArgs(["help"])).toEqual({ kind: "help" });
    expect(parseCliArgs(["--help"])).toEqual({ kind: "help" });
    expect(parseCliArgs(["-h"])).toEqual({ kind: "help" });
  });

  it("refuses an unknown command or option instead of starting the server", () => {
    expect(parseCliArgs(["serve"])).toEqual({
      kind: "unknown",
      argument: "serve",
    });
    expect(parseCliArgs(["setup", "--force"])).toEqual({
      kind: "unknown",
      argument: "--force",
    });
    expect(parseCliArgs(["logs", "--hooks"])).toEqual({
      kind: "unknown",
      argument: "--hooks",
    });
  });
});

describe("hookCommand", () => {
  it("runs the hook through npx only when the CLI itself came from npx; otherwise the installed files", () => {
    expect(hookCommand("/Users/me/.npm/_npx/1a2b/node_modules/sitewright/dist/bin.mjs", "/usr/bin/node")).toBe(
      "npx -y sitewright@latest hook",
    );
    expect(hookCommand("/opt/mcp framer/dist/bin.mjs", "/usr/local/bin/node")).toBe(
      '"/usr/local/bin/node" "/opt/mcp framer/dist/bin.mjs" hook',
    );
  });
});

describe("setupInstructions", () => {
  it("gives the Claude Code commands, with and without a Server API key", () => {
    const text = setupInstructions("sitewright");

    expect(text).toContain("claude mcp add sitewright -- npx -y sitewright@latest");
    expect(text).toContain("-e FRAMER_API_KEY=");
    expect(text).toContain("-e FRAMER_PROJECT_URL=");
  });

  it("gives a config block other clients accept as JSON", () => {
    const block = setupInstructions("sitewright").split("```json\n")[1]?.split("\n```")[0] ?? "";

    expect(JSON.parse(block)).toEqual({
      mcpServers: {
        sitewright: {
          command: "npx",
          args: ["-y", "sitewright@latest"],
        },
      },
    });
  });
});

describe("nodeVersionProblem", () => {
  it("accepts the minimum and newer versions", () => {
    expect(nodeVersionProblem("24.11.0", "24.11.0")).toBeNull();
    expect(nodeVersionProblem("25.0.1", "24.11.0")).toBeNull();
  });

  it("explains an older Node", () => {
    expect(nodeVersionProblem("20.18.0", "24.11.0")).toContain("Node.js 24.11.0 or newer");
    expect(nodeVersionProblem("24.10.9", "24.11.0")).toContain("you have 24.10.9");
  });
});

it("regression: lists the saved keys outside a terminal too, since the list asks nothing", async () => {
  const home = await mkdtemp(join(tmpdir(), "sitewright-cli-"));
  const output = execFileSync(
    process.execPath,
    [fileURLToPath(new URL("../src/bin.ts", import.meta.url)), "key", "list"],
    {
      cwd: home,
      env: {
        ...process.env,
        HOME: home,
        SITEWRIGHT_HOME: join(home, ".sitewright"),
      },
      stdio: ["pipe", "pipe", "pipe"],
      encoding: "utf8",
    },
  );

  expect(output).toMatch(/No keys saved yet/);
});

it("installs the Sitewright skill for Claude Code once, and updates an older copy", async () => {
  const home = await mkdtemp(join(tmpdir(), "sitewright-skill-"));
  const { installSkill } = await import("../src/cli/install-skill.ts");

  expect(await installSkill(home)).toMatch(/^Installed/);
  expect(await installSkill(home)).toMatch(/installed already/);
  await writeFile(join(home, ".claude", "skills", "sitewright", "SKILL.md"), "old");
  expect(await installSkill(home)).toMatch(/^Updated/);
  expect(await readFile(join(home, ".claude", "skills", "sitewright", "SKILL.md.bak"), "utf8")).toBe("old");
});
