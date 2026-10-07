import { mkdir, writeFile } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";
import { EXPORT_DIR, EXPORT_FETCH_TIMEOUT_MS, EXPORT_USER_AGENT } from "../constants/export.ts";

/** The folder an export goes to: the one given (relative to where the server runs), or framer-export there. */
export function exportDir(dir: string | undefined): string {
  return dir === undefined ? resolve(process.cwd(), EXPORT_DIR) : isAbsolute(dir) ? dir : resolve(process.cwd(), dir);
}

/** A file name from a layer or page name. */
export function fileSlug(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug === "" ? "export" : slug;
}

/** Writes the files into the folder, making it when missing; returns their paths. */
export async function writeExport(dir: string, files: Readonly<Record<string, string>>): Promise<string[]> {
  await mkdir(dir, { recursive: true });

  return Promise.all(
    Object.entries(files).map(async ([name, content]) => {
      const path = join(dir, name);

      await writeFile(path, content, "utf8");

      return path;
    }),
  );
}

/** A public URL's text, or an error naming its status. */
export async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { "user-agent": EXPORT_USER_AGENT },
    signal: AbortSignal.timeout(EXPORT_FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`${url} answered ${response.status}.`);
  }

  return response.text();
}

/** A standalone HTML document around exported markup and its stylesheet. */
export function htmlDocument(title: string, html: string, css: string): string {
  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${title.replaceAll("<", "&lt;")}</title>`,
    `<style>\n${css}\n</style>`,
    "</head>",
    "<body>",
    html,
    "</body>",
    "</html>",
    "",
  ].join("\n");
}
