import { describe, expect, it } from "vitest";
import { normalizeDslResult } from "../src/dsl/result.ts";

describe("normalizeDslResult", () => {
  it("marks command errors as not ok and keeps their targets", () => {
    const result = normalizeDslResult({
      message: "Commands: 1 error.",
      errors: { "Cannot complete `SET`: The target does not exist.": ["nonexistent123"] },
      renamedIds: { tsHeading: "DuWoDInOY" },
    });

    expect(result).toMatchObject({
      ok: false,
      errors: [
        {
          message: "Cannot complete `SET`: The target does not exist.",
          targets: ["nonexistent123"],
        },
      ],
      renamedIds: { tsHeading: "DuWoDInOY" },
    });
  });

  it("says that the commands without errors were applied, so only the failed ones go again", () => {
    // Framer applies every command it can: re-sending the whole batch would create its nodes a second time.
    const result = normalizeDslResult({
      message: "Commands: 1 error. Design: 22 created.",
      errors: { 'Invalid value `textStylePreset="Lab/Heading"`.': ["+RichTextNode tTitle"] },
      renamedIds: { tCard: "DuWoDInOY" },
    });

    expect(result.message).toContain("Commands: 1 error. Design: 22 created.");
    expect(result.message).toMatch(/applied every command without an error/);
    expect(result.message).toMatch(/only the failed commands/);
  });

  it("keeps warnings and linter findings without failing", () => {
    const result = normalizeDslResult({
      message: "Commands: 1 warning. Lint: 1 warning.",
      warnings: { "Auto-closed an unterminated quote while repairing this command.": ["SET WQLkyLRf1"] },
      linter: {
        warnings: {
          "Node is visually clipped by an ancestor.": [
            {
              id: "s1",
              clippedBy: "WQLkyLRf1",
            },
          ],
        },
      },
    });

    expect(result.ok).toBe(true);
    expect(result.warnings[0]?.targets).toEqual(["SET WQLkyLRf1"]);
    expect(result.lint).toEqual([
      {
        message: "Node is visually clipped by an ancestor.",
        severity: "warning",
        details: [
          {
            id: "s1",
            clippedBy: "WQLkyLRf1",
          },
        ],
      },
    ]);
  });

  it("treats parse errors and unexpected responses as failures", () => {
    expect(
      normalizeDslResult({
        message: "x",
        parseErrors: ["line 1"],
      }).ok,
    ).toBe(false);
    expect(normalizeDslResult("nope").ok).toBe(false);
  });

  it("regression: an empty parseErrors is not a failure", () => {
    expect(
      normalizeDslResult({
        message: "x",
        parseErrors: [],
      }).ok,
    ).toBe(true);
    expect(
      normalizeDslResult({
        message: "x",
        parseErrors: {},
      }).ok,
    ).toBe(true);
  });
});
