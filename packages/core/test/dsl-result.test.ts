import { describe, expect, it } from "vitest";
import { assetFailureResult, normalizeDslResult } from "../src/dsl/result.ts";

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

  it("regression: an image URL Framer cannot download refuses the batch in words, without Framer's own ids", () => {
    const result = assetFailureResult(
      "Assets upload from URL https://example.com/missing.png to YAlYa1ydRLCwxtlTcmns failed. could not get asset, response code 404",
    );

    expect(result).toMatchObject({
      ok: false,
      errors: [{ targets: ["https://example.com/missing.png"] }],
    });
    expect(JSON.stringify(result)).not.toContain("YAlYa1ydRLCwxtlTcmns");
    expect(assetFailureResult("Something else broke")).toBeNull();
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

it("regression: drops the 'too close' pairs Framer measures at a negative spacing (seen: -1852.7 after hiding a section and a MOVE)", () => {
  const { lint } = normalizeDslResult({
    message: "Lint: 2 warnings.",
    linter: {
      warnings: {
        "Visible siblings are too close": [
          {
            id: "a",
            siblingId: "b",
            spacing: -1852.7,
          },
          {
            id: "c",
            siblingId: "d",
            spacing: 4,
          },
        ],
        "Visible siblings are too close together": [
          {
            id: "e",
            siblingId: "f",
            spacing: -12,
          },
        ],
      },
    },
  });

  expect(lint).toEqual([
    expect.objectContaining({
      message: "Visible siblings are too close",
      details: [
        {
          id: "c",
          siblingId: "d",
          spacing: 4,
        },
      ],
    }),
  ]);
});

// Framer's linter misfires on component canvases: variants side by side "overlap", and a hover variant's background
// drawn by a layer of its own is not the background it checks text against (seen 12.10.2026).
it("regression: marks Framer's lint messages known to misfire as low confidence, with why", () => {
  const { lint } = normalizeDslResult({
    message: "Lint: 3 warnings.",
    linter: {
      warnings: {
        "Ground nodes overlap": ["a", "b"],
        "Text has low contrast against its background (2.1:1)": ["t"],
        "Content should set a maxWidth": ["x"],
      },
    },
  });

  expect(lint).toEqual([
    expect.objectContaining({
      message: "Ground nodes overlap",
      confidence: "low",
      note: expect.stringContaining("variants"),
    }),
    expect.objectContaining({
      confidence: "low",
      note: expect.stringContaining("layer"),
    }),
    expect.not.objectContaining({ confidence: "low" }),
  ]);
});
