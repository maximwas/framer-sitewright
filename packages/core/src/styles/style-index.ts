import { normalizeAssetPath } from "./asset-path.ts";

/** Styles by canonical path. Takes the port's promise, so a call site reads and indexes in one step. */
export async function indexByPath<S extends { readonly path: string }>(
  styles: Promise<readonly S[]>,
): Promise<ReadonlyMap<string, S>> {
  return new Map((await styles).map((style) => [normalizeAssetPath(style.path), style]));
}

export function findDuplicatePaths(paths: readonly string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const path of paths) {
    if (seen.has(path)) {
      duplicates.add(path);
    }

    seen.add(path);
  }

  return [...duplicates];
}
