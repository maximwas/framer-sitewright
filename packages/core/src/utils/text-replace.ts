import type { SerializedNode } from "../types/dsl.ts";
import type { TextFormatting } from "../types/site.ts";

/** `text` with every `find` replaced, in any case unless `matchCase`; null when it has none. */
export function replaceText(text: string, find: string, replacement: string, matchCase: boolean): string | null {
  const pattern = findPattern(find, matchCase);

  if (!pattern.test(text)) {
    return null;
  }

  pattern.lastIndex = 0;

  return text.replace(pattern, () => replacement);
}

/**
 * The spellings of `find` in `text` to send to framer.agent.replaceText, which matches exactly: one call per spelling
 * replaces every match of it. A spelling the replacement holds goes first, so no later call replaces the replacement
 * again; null when the replacement holds two spellings, since then some order always would.
 */
export function spellingsToSend(text: string, find: string, replacement: string, matchCase: boolean): string[] | null {
  const spellings = [...new Set(text.match(findPattern(find, matchCase)) ?? [])];
  const inReplacement = spellings.filter((spelling) => replacement.includes(spelling));

  return inReplacement.length > 1
    ? null
    : [...inReplacement, ...spellings.filter((spelling) => !inReplacement.includes(spelling))];
}

/**
 * What an in-place replace does to a rich text's formatting (`content` as serialize() reads it): a match inside one
 * run, or across runs formatted alike, keeps it; one across runs formatted differently comes out in the formatting of
 * the run it starts in (seen live, 06.10.2026). A text without runs (bound to a variable) has none to lose.
 */
export function replaceFormatting(content: SerializedNode | null, find: string, matchCase: boolean): TextFormatting {
  const segments = content === null ? [] : segmentsOf(content);
  const text = segments.map((segment) => segment.text).join("");
  const pattern = findPattern(find, matchCase);

  for (const match of text.matchAll(pattern)) {
    const start = match.index;
    const end = start + match[0].length;
    const formats = new Set<string>();
    let offset = 0;

    for (const segment of segments) {
      const segmentEnd = offset + segment.text.length;

      if (offset < end && segmentEnd > start) {
        formats.add(segment.format);
      }

      offset = segmentEnd;
    }

    if (formats.size > 1) {
      return "partial";
    }
  }

  return "kept";
}

function findPattern(find: string, matchCase: boolean): RegExp {
  return new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), matchCase ? "g" : "gi");
}

/** A rich text's runs in reading order, each with its formatting; blocks and line breaks end as their own segment. */
function segmentsOf(node: SerializedNode): { text: string; format: string }[] {
  const children = (node.children ?? []).filter(
    (child): child is SerializedNode => typeof child === "object" && child !== null && "type" in child,
  );

  return children.flatMap((child) => {
    if (child.type === "TextRun") {
      const { text, ...format } = child.attributes ?? {};

      return [
        {
          text: typeof text === "string" ? text : "",
          format: JSON.stringify(Object.entries(format).sort(([a], [b]) => a.localeCompare(b))),
        },
      ];
    }

    const lineBreak = {
      text: "\n",
      format: "\n",
    };

    return child.type === "TextLineBreak" ? [lineBreak] : [...segmentsOf(child), lineBreak];
  });
}
