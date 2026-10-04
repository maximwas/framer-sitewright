// The `sitewright` command on this computer, from this clone: what `npm install -g sitewright` gives people, before the
// package is on npm. `pnpm local:link` builds and writes a small launcher into npm's global bin folder, or into
// ~/.local/bin when that folder needs sudo (Node.js from the official installer: /usr/local/bin). Then `sitewright`,
// `sitewright key` and the rest run this repository's build in any folder; a rebuild needs no relink.
// `pnpm local:unlink` removes the launchers, and only ones this script wrote.
import { execFileSync } from "node:child_process";
import { accessSync, chmodSync, constants, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { delimiter, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const COMMAND = "sitewright";
const MARK = "# sitewright local link";

if (process.platform === "win32") {
  fail("local:link writes a shell launcher: macOS and Linux only. On Windows, run node apps/server/dist/bin.mjs.");
}

const repo = dirname(dirname(fileURLToPath(import.meta.url)));
const bin = join(repo, "apps", "server", "dist", "bin.mjs");
// pnpm passes its own npm_config_* settings down; npm warns about the ones it does not know.
const npmEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith("npm_config_")));
const npmBin = join(execFileSync("npm", ["prefix", "-g"], { env: npmEnv, encoding: "utf8" }).trim(), "bin");
const localBin = join(homedir(), ".local", "bin");
const folders = [npmBin, localBin];

if (process.argv[2] === "unlink") {
  const removed = folders.map((folder) => join(folder, COMMAND)).filter(ours);

  for (const launcher of removed) {
    rmSync(launcher);
    console.log(`Removed ${launcher}.`);
  }

  if (removed.length === 0) {
    console.log(`No local link in ${folders.join(" or ")}.`);
  }

  process.exit(0);
}

if (!existsSync(bin)) {
  fail(`${bin} is missing: run pnpm build first.`);
}

const folder = writable(npmBin) ? npmBin : localBin;
const launcher = join(folder, COMMAND);

if (existsSync(launcher) && !ours(launcher)) {
  fail(`${launcher} is an installed ${COMMAND}, not a local link. Remove it first: npm uninstall -g ${COMMAND}`);
}

mkdirSync(folder, { recursive: true });
writeFileSync(launcher, `#!/bin/sh\n${MARK}: ${repo}\nexec node "${bin}" "$@"\n`);
chmodSync(launcher, 0o755);

const onPath = (process.env.PATH ?? "").split(delimiter).includes(folder);

console.log(
  [
    `${launcher} → ${bin}`,
    ...(onPath ? [] : ["", `${folder} is not on PATH. Add it to ~/.zshrc: export PATH="${folder}:$PATH"`]),
    "",
    `  ${COMMAND}            the setup wizard (in a terminal)`,
    `  ${COMMAND} key        a project's Server API key`,
    `  ${COMMAND} settings   what the agent may do`,
    `  ${COMMAND} open       the journal page of the running server`,
    "",
    "After code changes, pnpm build is enough. Remove the command: pnpm local:unlink",
  ].join("\n"),
);

function ours(launcher) {
  return existsSync(launcher) && readFileSync(launcher, "utf8").includes(MARK);
}

function writable(folder) {
  try {
    accessSync(folder, constants.W_OK);

    return true;
  } catch {
    return false;
  }
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
