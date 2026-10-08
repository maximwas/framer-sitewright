import { splitSections } from "@sitewright/core";
import { expect, it } from "vitest";
import { essentialsOf } from "../src/utils/docs.ts";

it("puts Framer's essential sections together in reading order, each with its subsections, without its design rules", () => {
  const sections = splitSections(
    [
      "# Overview",
      "About the agent.",
      "# Design Rules",
      "Rules.",
      "## Typography",
      "Type rules.",
      "# Guardrails",
      "Never guess ids.",
      "# Updating the Project",
      "## Command Syntax",
      "+FrameNode …;",
    ].join("\n"),
  );
  const text = essentialsOf(sections);

  expect(text.indexOf("Never guess ids.")).toBeLessThan(text.indexOf("+FrameNode"));
  // Sitewright gives no design advice, so Framer's own design rules stay out of the essentials.
  expect(text).not.toContain("Type rules.");
  expect(text).not.toContain("About the agent.");
});
