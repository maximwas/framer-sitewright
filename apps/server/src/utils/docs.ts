import { type DocSection, findSection } from "@sitewright/core";
import { ESSENTIAL_SECTIONS } from "../constants/docs.ts";

/** The reference's essential sections as one text, each with its subsections; a section the reference lacks is skipped. */
export function essentialsOf(sections: readonly DocSection[]): string {
  return ESSENTIAL_SECTIONS.map((id) => findSection(sections, id)?.content)
    .filter((content) => content !== undefined)
    .join("\n\n");
}
