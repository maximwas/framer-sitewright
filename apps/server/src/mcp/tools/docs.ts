import type { McpServer } from "@modelcontextprotocol/server";
import {
  type DocSection,
  findSection,
  OperationError,
  requireAgent,
  searchSections,
  sliceContent,
} from "@sitewright/core";
import { guideNames, readGuide, resolveGuideName } from "../../docs/guides.ts";
import { DocsInputSchema, DocsOutputSchema } from "../../schemas/mcp.ts";
import type { DocsOutput, ToolContext } from "../../types/mcp.ts";
import { addTool } from "../add-tool.ts";

export function registerDocsTools(server: McpServer, { transports, docs, journal }: ToolContext): void {
  addTool(server, {
    name: "framer_docs",
    title: "Framer DSL reference",
    description:
      "Framer's official agent reference for the design DSL (commands, attributes, layout rules, CMS, variables, forms, effects). No arguments lists sections; pass section to read one, or query to search. guide reads one of Framer's implementation guides (FAQ, Navigations, Buttons, Effects, Overlays, Forms, Grids…): read the one for what you build before building it, they hold the recipes the reference lacks (e.g. how an accordion animates).",
    input: DocsInputSchema,
    output: DocsOutputSchema,
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: true,
    },
    run: ({ section, query, guide, offset, limit }) =>
      journal.read(
        "framer_docs",
        "Framer docs",
        // The reference and the guides come from framer.agent (getSystemPrompt, readProject).
        "framer-agent",
        () => ({ subject: docsSubject(section, query, guide) }),
        async () => {
          const sections = await docs.getSections(() =>
            transports.withServerApi((runtime) => requireAgent(runtime).getSystemPrompt()),
          );

          if (guide !== undefined) {
            const name = resolveGuideName(guideNames(sections), guide);
            const text = await transports.withServerApi((runtime) => readGuide(runtime, name));

            return guideResult(name, text, offset, limit);
          }

          if (section !== undefined) {
            return sectionResult(sections, section, offset, limit);
          }

          if (query !== undefined) {
            return searchResult(sections, query);
          }

          return indexResult(sections);
        },
      ),
  });
}

/** What the panel says the AI read in the reference. */
function docsSubject(section: string | undefined, query: string | undefined, guide: string | undefined): string {
  if (guide !== undefined) {
    return `Guide: ${guide}`;
  }

  if (section !== undefined) {
    return `Section: ${section}`;
  }

  return query === undefined ? "Index" : `Search: “${query}”`;
}

const toEntry = ({ id, title, level }: DocSection) => ({
  id,
  title,
  level,
  snippet: null,
});

function indexResult(sections: DocSection[]): DocsOutput {
  const topLevel = sections.filter((entry) => entry.level <= 2).map(toEntry);

  return {
    mode: "index",
    sections: topLevel,
    content: null,
    nextOffset: null,
  };
}

function searchResult(sections: DocSection[], query: string): DocsOutput {
  return {
    mode: "search",
    sections: searchSections(sections, query, 12),
    content: null,
    nextOffset: null,
  };
}

function guideResult(name: string, guide: string, offset: number, limit: number): DocsOutput {
  const { text, nextOffset } = sliceContent(guide, offset, limit);

  return {
    mode: "guide",
    sections: [
      {
        id: `guide-${name.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`,
        title: name,
        level: 1,
        snippet: null,
      },
    ],
    content: text,
    nextOffset,
  };
}

function sectionResult(sections: DocSection[], section: string, offset: number, limit: number): DocsOutput {
  const found = findSection(sections, section);

  if (found === undefined) {
    throw new OperationError(
      "NOT_FOUND",
      `No reference section matches "${section}".`,
      "Call framer_docs without arguments to list sections.",
    );
  }

  const { text, nextOffset } = sliceContent(found.content, offset, limit);

  return {
    mode: "section",
    sections: [toEntry(found)],
    content: text,
    nextOffset,
  };
}
