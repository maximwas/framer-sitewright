import { type DocSection, type FramerRuntime, OperationError, requireAgent } from "@sitewright/core";
import { GUIDE_INDEX_LINE, GUIDE_INDEX_SECTION, GUIDE_QUERY_TYPE } from "../constants/docs.ts";
import { GuideResultsSchema } from "../schemas/mcp.ts";

/**
 * Framer's implementation guides (FAQ, Navigations, Buttons…): recipes with example nodes that the DSL reference only
 * lists by name. The list comes from the reference itself, so it follows Framer's changes.
 */
export function guideNames(sections: readonly DocSection[]): string[] {
  const index = sections.find((section) => section.id === GUIDE_INDEX_SECTION);

  return (index?.content ?? "").split("\n").flatMap((line) => {
    const name = GUIDE_INDEX_LINE.exec(line.trim())?.[1];

    return name === undefined ? [] : [name];
  });
}

/** The exact name Framer knows a guide by (names are case-sensitive there), or NOT_FOUND listing them. */
export function resolveGuideName(names: readonly string[], requested: string): string {
  const exact = names.find((name) => name.toLowerCase() === requested.toLowerCase());

  if (exact !== undefined || names.length === 0) {
    return exact ?? requested;
  }

  throw new OperationError("NOT_FOUND", `No implementation guide "${requested}".`, `Guides: ${names.join(", ")}.`);
}

/** One guide's text, read through the Server API. */
export async function readGuide(runtime: FramerRuntime, name: string): Promise<string> {
  const answer = GuideResultsSchema.parse(
    await requireAgent(runtime).readProject([
      {
        type: GUIDE_QUERY_TYPE,
        name,
      },
    ]),
  );
  const guide = answer.results[0]?.guide;

  if (guide === undefined) {
    throw new OperationError(
      "NOT_FOUND",
      `Framer returned no guide "${name}".`,
      "Call framer_docs without arguments and read the section listing the guides.",
    );
  }

  return guide;
}
