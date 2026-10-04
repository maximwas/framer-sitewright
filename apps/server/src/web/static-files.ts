import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { CONTENT_TYPES } from "../constants/web.ts";

/** The built web app: dist/web next to the bundle (the npm package), else apps/web/dist in the workspace. */
export function findWebRoot(): string | null {
  const roots = [fileURLToPath(new URL("./web", import.meta.url)), workspaceWebRoot()];

  return roots.find((root): root is string => root !== null && existsSync(join(root, "index.html"))) ?? null;
}

/** apps/web/dist, resolved through the workspace package; null outside the workspace. */
function workspaceWebRoot(): string | null {
  try {
    return join(dirname(createRequire(import.meta.url).resolve("@sitewright/web/package.json")), "dist");
  } catch {
    return null;
  }
}

/**
 * A file of the web app for a URL path, or null; "/" is the index. Paths that do not decode, or that point outside the
 * root, are refused.
 */
export async function readStatic(
  root: string,
  pathname: string,
): Promise<{ body: Buffer; contentType: string } | null> {
  const relative = pathname === "/" ? "index.html" : decodePath(pathname);
  const file = relative === null ? null : normalize(join(root, relative));

  if (file === null || !file.startsWith(`${root}${sep}`)) {
    return null;
  }

  try {
    return {
      body: await readFile(file),
      contentType: CONTENT_TYPES[extname(file)] ?? "application/octet-stream",
    };
  } catch {
    return null;
  }
}

/** A URL path as a relative file path, or null when it is not valid percent-encoding (e.g. `/%E0%A4%A`). */
function decodePath(pathname: string): string | null {
  try {
    return decodeURIComponent(pathname).replace(/^\/+/, "");
  } catch {
    return null;
  }
}
