// Copies the built web app into dist/web, so the published package serves it without the workspace.
import { cpSync, existsSync, rmSync } from "node:fs";

const from = new URL("../../web/dist/", import.meta.url);
const to = new URL("../dist/web/", import.meta.url);

if (!existsSync(new URL("index.html", from))) {
  process.stderr.write("apps/web is not built: run `pnpm --filter @sitewright/web build` first.\n");
  process.exit(1);
}

rmSync(to, { recursive: true, force: true });
cpSync(from, to, { recursive: true });
