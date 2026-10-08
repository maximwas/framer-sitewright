import type { McpServer } from "@modelcontextprotocol/server";
import { type DocSection, findSection, framerRead, requireAgent, searchSections, sliceContent } from "@sitewright/core";
import * as z from "zod";
import { ESSENTIALS_SECTION } from "../../constants/docs.ts";
import { GUIDE_TOPICS } from "../../constants/knowledge.ts";
import { guideNames, readGuide, resolveGuideName } from "../../docs/guides.ts";
import { readGuideTopic } from "../../knowledge/guide.ts";
import { DocsInputSchema, DocsOutputSchema } from "../../schemas/mcp.ts";
import type { GuideTopic } from "../../types/knowledge.ts";
import type { DocsOutput, ToolContext } from "../../types/mcp.ts";
import { essentialsOf } from "../../utils/docs.ts";
import { addOperationTool, addTool } from "../add-tool.ts";

export function registerDocsTools(server: McpServer, context: ToolContext): void {
  const { transports, docs, journal } = context;

  const topics = Object.keys(GUIDE_TOPICS) as [GuideTopic, ...GuideTopic[]];

  addTool(server, {
    name: "design_guide",
    title: "Design guide",
    description: `How to change a Framer site so it holds together, from live builds: what Framer does without saying so, layout, motion and the checks. Read "dsl" before the first design_apply of a session, then the topic for the task. Topics: ${Object.entries(
      GUIDE_TOPICS,
    )
      .map(([name, about]) => `${name} (${about})`)
      .join("; ")}.`,
    input: z.strictObject({
      topic: z.enum(topics).default("dsl").describe("Which part of the guide to read."),
    }),
    output: z.object({
      topic: z.string(),
      text: z.string(),
      topics: z.array(z.string()),
    }),
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: false,
    },
    run: async ({ topic }) => {
      const text = await readGuideTopic(topic);

      // The journal's skills view shows that the agent followed the guide, and which part.
      await journal.noteSkill({
        at: new Date().toISOString(),
        skill: "sitewright-design-guide",
        reference: topic,
      });

      return {
        topic,
        text,
        topics,
      };
    },
  });

  addTool(server, {
    name: "framer_docs",
    title: "Framer DSL reference",
    description:
      "Framer's official agent reference for the design DSL (commands, attributes, layout rules, CMS, variables, forms, effects), read live from Framer so it matches its current version. Start with section \"essentials\": its guardrails, core principles, command syntax with computed values, design rules and critical reminders in one read (continue with nextOffset). No arguments lists sections; pass section to read one, or query to search. guide reads one of Framer's implementation guides (FAQ, Navigations, Buttons, Effects, Overlays, Forms, Grids…): read the one for what you build before building it, they hold the recipes the reference lacks (e.g. how an accordion animates). Needs the project's Server API key (framer_status shows whether it is set).",
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

          if (section?.toLowerCase() === ESSENTIALS_SECTION) {
            return essentialsResult(sections, offset, limit);
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
  addOperationTool(server, context, framerRead, {
    name: "framer_read",
    title: "Query Framer's agent",
    description:
      "Runs Framer's own readProject queries (font-search, component-definition, icon-set-definition, shader-definition, implementation guides…) and returns their answer as is: for what the other tools do not read. framer_docs section \"essentials\" lists the query types. Needs the project's Server API key.",
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

/** Framer's guardrails, core principles, command syntax, design rules and reminders as one read, page by page. */
function essentialsResult(sections: DocSection[], offset: number, limit: number): DocsOutput {
  const { text, nextOffset } = sliceContent(essentialsOf(sections), offset, limit);

  return {
    mode: "section",
    sections: [
      {
        id: ESSENTIALS_SECTION,
        title: "Essentials",
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

  // No section by that name: the sections that talk about it, to pick one from.
  if (found === undefined) {
    return searchResult(sections, section);
  }

  const { text, nextOffset } = sliceContent(found.content, offset, limit);

  return {
    mode: "section",
    sections: [toEntry(found)],
    content: text,
    nextOffset,
  };
}
