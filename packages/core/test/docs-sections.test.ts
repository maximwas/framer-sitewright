import { describe, expect, it } from "vitest";
import { findSection, searchSections, splitSections } from "../src/docs/sections.ts";

const DOC = [
  "# Overview",
  "Intro text.",
  "# Updating the Project",
  "```",
  "# not a heading inside a fence",
  "```",
  "## Variables",
  "Use +Variable to bind text.",
  "# Updating the Project",
  "Duplicate title.",
].join("\n");

describe("DSL reference sections", () => {
  const sections = splitSections(DOC);

  it("ignores headings in code fences, nests subsections and keeps ids unique", () => {
    expect(sections.map((section) => section.id)).toEqual([
      "overview",
      "updating-the-project",
      "updating-the-project-variables",
      "updating-the-project-2",
    ]);
    expect(sections[1]?.content).toContain("Use +Variable");
    expect(sections[1]?.content).not.toContain("Duplicate title.");
  });

  it("finds sections by title and searches the most specific body match first", () => {
    expect(findSection(sections, "variables")?.id).toBe("updating-the-project-variables");
    expect(searchSections(sections, "bind text")[0]?.id).toBe("updating-the-project-variables");
  });

  it("regression: takes no section whose title only ends with the word (seen: Interactions gave Illegal Replica Interactions)", () => {
    expect(findSection(sections, "project")).toBeUndefined();
    expect(findSection(sections, "updating")?.id).toBe("updating-the-project");
  });
});
