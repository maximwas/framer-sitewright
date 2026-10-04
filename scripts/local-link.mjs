// The `sitewright` command on this computer, from this clone: what `npm install -g sitewright` gives people, before the
// package is on npm. `pnpm local:link` builds and writes a small launcher into npm's global bin folder (on PATH with
// nvm and a plain Node.js install), so `sitewright`, `sitewright key` and the rest run this repository's build in any
// folder; a rebuild needs no relink. `pnpm local:unlink` removes the launcher, and only one this script wrote.
import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const COMMAND = "sitewright";
const MARK = "# sitewright local link";

if (process.platform === "win32") {
  console.error(
    "local:link writes a shell launcher: macOS and Linux only. On Windows, run node apps/server/dist/bin.mjs.",
  );
  process.exit(1);
}

const repo = dirname(dirname(fileURLToPath(import.meta.url)));
const bin = join(repo, "apps", "server", "dist", "bin.mjs");
// pnpm passes its own npm_config_* settings down; npm warns about the ones it does not know.
const npmEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith("npm_config_")));
const globalBin = join(execFileSync("npm", ["prefix", "-g"], { env: npmEnv, encoding: "utf8" }).trim(), "bin");
const launcher = join(globalBin, COMMAND);
const ours = existsSync(launcher) && readFileSync(launcher, "utf8").includes(MARK);

if (process.argv[2] === "unlink") {
  if (ours) {
    rmSync(launcher);
    console.log(`Removed ${launcher}.`);
  } else {
    console.log(`No local link at ${launcher}.`);
  }

  process.exit(0);
}

if (existsSync(launcher) && !ours) {
  console.error(
    `${launcher} is an installed ${COMMAND}, not a local link. Remove it first: npm uninstall -g ${COMMAND}`,
  );
  process.exit(1);
}

if (!existsSync(bin)) {
  console.error(`${bin} is missing: run pnpm build first.`);
  process.exit(1);
}

writeFileSync(launcher, `#!/bin/sh\n${MARK}: ${repo}\nexec node "${bin}" "$@"\n`);
chmodSync(launcher, 0o755);
console.log(
  [
    `${COMMAND} → ${bin}`,
    "",
    `  ${COMMAND}            the setup wizard (in a terminal)`,
    `  ${COMMAND} key        a project's Server API key`,
    `  ${COMMAND} settings   what the agent may do`,
    `  ${COMMAND} open       the journal page of the running server`,
    "",
    "After code changes, pnpm build is enough. Remove the command: pnpm local:unlink",
  ].join("\n"),
);
