import { MARKDOWN_HEADING } from "../constants/docs.ts";
import type { DocSection, Heading, SectionMatch } from "../types/docs.ts";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Splits markdown into sections at headings up to level 4; each section runs until the next heading of its level. */
export function splitSections(markdown: string): DocSection[] {
  const lines = markdown.split("\n");
  const headings = findHeadings(lines);
  const used = new Set<string>();
  const stack: Heading[] = [];

  return headings.map((heading, position) => {
    while (stack.length > 0 && (stack.at(-1)?.level ?? 0) >= heading.level) {
      stack.pop();
    }

    const parents = stack.map((entry) => entry.title);
    const next = headings.slice(position + 1).find((candidate) => candidate.level <= heading.level);

    stack.push(heading);

    return {
      id: uniqueId(slugify([...parents, heading.title].join(" ")) || "section", used),
      title: heading.title,
      level: heading.level,
      parents,
      content: lines
        .slice(heading.index, next?.index ?? lines.length)
        .join("\n")
        .trim(),
    };
  });
}

/** Markdown headings, skipping lines inside fenced code blocks. */
function findHeadings(lines: readonly string[]): Heading[] {
  const headings: Heading[] = [];
  let inFence = false;

  for (const [index, line] of lines.entries()) {
    if (line.trimStart().startsWith("```")) {
      inFence = !inFence;
      continue;
    }

    const match = inFence ? null : MARKDOWN_HEADING.exec(line);

    if (match !== null) {
      headings.push({
        index,
        level: (match[1] ?? "#").length,
        title: (match[2] ?? "").trim(),
      });
    }
  }

  return headings;
}

/** Suffixes -2, -3, … until the id is free: a heading's own slug may already end in "-2". */
function uniqueId(base: string, used: Set<string>): string {
  let id = base;

  for (let suffix = 2; used.has(id); suffix++) {
    id = `${base}-${suffix}`;
  }

  used.add(id);

  return id;
}

/** Finds by id, exact title, then title substring. The MCP layer trims `idOrTitle`. */
export function findSection(sections: readonly DocSection[], idOrTitle: string): DocSection | undefined {
  const wanted = idOrTitle.toLowerCase();

  return (
    sections.find((section) => section.id === wanted) ??
    sections.find((section) => section.title.toLowerCase() === wanted) ??
    sections.find((section) => section.title.toLowerCase().includes(wanted))
  );
}

function snippet(content: string, needle: string): string {
  const at = Math.max(0, content.toLowerCase().indexOf(needle));
  const start = Math.max(0, at - 80);

  return content
    .slice(start, start + 240)
    .replace(/\s+/g, " ")
    .trim();
}

/** Title matches first, then body matches from the most specific level. The MCP layer trims `query`. */
export function searchSections(sections: readonly DocSection[], query: string, limit = 10): SectionMatch[] {
  const needle = query.toLowerCase();
  const titleHits = sections.filter((section) => section.title.toLowerCase().includes(needle));
  const bodyHits = sections
    .filter((section) => !titleHits.includes(section) && section.content.toLowerCase().includes(needle))
    .sort((a, b) => b.level - a.level);

  return [...titleHits, ...bodyHits].slice(0, limit).map((section) => ({
    id: section.id,
    title: section.title,
    level: section.level,
    snippet: snippet(section.content, needle),
  }));
}

export function sliceContent(
  content: string,
  offset: number,
  limit: number,
): { text: string; nextOffset: number | null } {
  const text = content.slice(offset, offset + limit);
  const end = offset + text.length;

  return {
    text,
    nextOffset: end < content.length ? end : null,
  };
}
