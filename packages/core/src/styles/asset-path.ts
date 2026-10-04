import { OperationError } from "../errors.ts";

/** "Brand/Primary" is the canonical style path for tools; Framer reports it as "/Brand/Primary". */
export function normalizeAssetPath(input: string): string {
  const segments = input
    .split("/")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);

  if (segments.length === 0) {
    throw new OperationError("INVALID_PATH", `Invalid style path "${input}".`, 'Use paths like "Brand/Primary".');
  }

  return segments.join("/");
}

/** True for the folder itself and everything inside it: "Brand" holds "Brand" and "Brand/Primary". */
export function isInFolder(path: string, folder: string): boolean {
  return path === folder || path.startsWith(`${folder}/`);
}
