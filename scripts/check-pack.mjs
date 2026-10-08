// Packs the server the way `npm publish` would, installs the tarball into an empty folder and checks it works there:
// the CLI, the MCP server on stdio without any Framer credentials, and the web app inside the package.
import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const PACKAGE = "sitewright";
const PROTOCOL_VERSION = "2025-11-25";

const work = mkdtempSync(join(tmpdir(), `${PACKAGE}-pack-`));
// pnpm passes its own npm_config_* settings down; npm warns about the ones it does not know.
const npmEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith("npm_config_")));

try {
  execFileSync("pnpm", ["--filter", PACKAGE, "pack", "--pack-destination", work], { stdio: "inherit" });
  const tarball = readdirSync(work).find((name) => name.endsWith(".tgz"));

  if (tarball === undefined) {
    throw new Error("pnpm pack produced no tarball");
  }

  execFileSync("npm", ["init", "-y"], { cwd: work, env: npmEnv, stdio: "ignore" });
  execFileSync("npm", ["install", "--no-audit", "--no-fund", join(work, tarball)], {
    cwd: work,
    env: npmEnv,
    stdio: "inherit",
  });

  const bin = join(work, "node_modules", ".bin", PACKAGE);
  const run = (args) => execFileSync(bin, args, { cwd: work, encoding: "utf8" });
  const version = run(["--version"]).trim();
  const setup = run(["setup"]);

  if (!/^\d+\.\d+\.\d+$/.test(version) || !setup.includes(`claude mcp add ${PACKAGE}`)) {
    throw new Error(`The CLI printed something unexpected:\n${version}\n${setup}`);
  }

  if (!existsSync(join(work, "node_modules", PACKAGE, "dist", "web", "index.html"))) {
    throw new Error("dist/web/index.html is missing from the package");
  }

  const tools = await countTools(bin, work);
  console.log(`ok: ${tarball}, version ${version}, ${tools} tools, web app and Framer guide included`);
} finally {
  rmSync(work, { recursive: true, force: true });
}

/** Starts the packaged MCP server on stdio and returns how many tools it lists. */
function countTools(command, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, [], {
      cwd,
      env: {
        ...process.env,
        CLAUDE_PROJECT_DIR: cwd,
        SITEWRIGHT_PLUGIN_BRIDGE: "off",
      },
    });
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("the server did not answer tools/list within 30 s"));
    }, 30_000);
    const send = (message) => child.stdin.write(`${JSON.stringify(message)}\n`);
    let buffer = "";
    let tools = 0;

    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      buffer += chunk;
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines.filter((text) => text.trim() !== "")) {
        const message = JSON.parse(line);

        if (message.id === 1) {
          send({ jsonrpc: "2.0", method: "notifications/initialized" });
          send({ jsonrpc: "2.0", id: 2, method: "tools/list" });
        } else if (message.id === 2) {
          tools = message.result.tools.length;
          // The Framer guide ships as files next to dist/: read one through the packaged server.
          send({
            jsonrpc: "2.0",
            id: 3,
            method: "tools/call",
            params: { name: "framer_guide", arguments: { topic: "layout" } },
          });
        } else if (message.id === 3) {
          clearTimeout(timer);
          child.kill();

          if (!message.result?.structuredContent?.text?.startsWith("# How layout works in Framer")) {
            reject(
              new Error(
                `framer_guide did not read the packaged guide: ${JSON.stringify(message.result ?? message.error)}`,
              ),
            );
          } else {
            resolve(tools);
          }
        }
      }
    });
    child.on("error", reject);
    send({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { protocolVersion: PROTOCOL_VERSION, capabilities: {}, clientInfo: { name: "check-pack", version: "0" } },
    });
  });
}
