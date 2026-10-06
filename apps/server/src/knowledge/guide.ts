import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import type { GuideTopic } from "../types/knowledge.ts";

/**
 * The folder with the design guide: `knowledge/` next to `dist/` in the published package, or apps/server/knowledge
 * when running from the workspace sources.
 */
function knowledgeRoot(): string | null {
  const candidates = [new URL("../knowledge/", import.meta.url), new URL("../../knowledge/", import.meta.url)].map(
    (url) => fileURLToPath(url),
  );

  return candidates.find((root) => existsSync(`${root}dsl.md`)) ?? null;
}

/** One topic of the design guide as Markdown. */
export function readGuideTopic(topic: GuideTopic): Promise<string> {
  return readFile(knowledgeFile(`${topic}.md`), "utf8");
}

/** A file of the knowledge folder, e.g. "skill/SKILL.md". */
export function knowledgeFile(relative: string): string {
  const root = knowledgeRoot();

  if (root === null) {
    throw new Error("The design guide is missing from this installation: reinstall the package.");
  }

  return `${root}${relative}`;
}
