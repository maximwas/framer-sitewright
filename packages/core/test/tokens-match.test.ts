import { expect, it } from "vitest";
import { runOperation } from "../src/operations/define.ts";
import { tokensMatch } from "../src/operations/styles/match.ts";
import { newTextStyle } from "../src/testing/fake-state.ts";
import { createFakeRuntime } from "../src/testing/index.ts";

it("names the nearest token for each design color and the nearest text style slot for each design font", async () => {
  const { runtime } = createFakeRuntime(
    {
      colorStyles: [
        {
          id: "ink",
          name: "Ink",
          path: "/Brand/Ink",
          light: "rgb(31, 27, 22)",
          dark: "rgb(241, 235, 226)",
        },
        {
          id: "glass",
          name: "Glass",
          path: "/Brand/Glass",
          light: "rgba(255, 255, 255, 0.1)",
          dark: null,
        },
      ],
      textStyles: [
        {
          ...newTextStyle("h2", "/Heading/H2"),
          font: {
            selector: "GF;Fraunces-600",
            family: "Fraunces",
            weight: 600,
            style: "normal",
          },
          fontSize: "48px",
          lineHeight: "1.1em",
          letterSpacing: "-0.02em",
        },
        newTextStyle("body", "/Body"),
      ],
    },
    {
      withAgent: false,
      transport: "plugin",
    },
  );

  const matched = await runOperation(
    tokensMatch,
    { runtime },
    {
      colors: ["#1f1b17", "rgba(255,255,255,0.1)"],
      fonts: [
        {
          family: "Fraunces",
          weight: 600,
          size: 48,
          lineHeight: 52.8,
          letterSpacing: -0.96,
        },
      ],
      limit: 1,
    },
  );

  expect(matched.colors.map(({ matches }) => matches[0]?.token)).toEqual(["Brand/Ink", "Brand/Glass"]);
  expect(matched.colors[0]?.matches[0]?.distance).toBeLessThan(1);
  // The 10% white meets its token exactly, opacity included.
  expect(matched.colors[1]?.matches[0]?.distance).toBe(0);
  expect(matched.fonts[0]?.matches[0]).toEqual({
    style: "Heading/H2",
    id: "h2",
    breakpoint: null,
    differences: {},
    score: 0,
  });
});

it("says what differs and by how much when no style matches exactly", async () => {
  const { runtime } = createFakeRuntime(
    { textStyles: [newTextStyle("body", "/Body")] },
    {
      withAgent: false,
      transport: "plugin",
    },
  );

  const matched = await runOperation(
    tokensMatch,
    { runtime },
    {
      fonts: [
        {
          family: "Geist",
          weight: 500,
          size: 18,
          lineHeight: 24,
        },
      ],
    },
  );

  // Body is Inter 400 at 16px with a 1.4em (22.4px) line: the style's values minus the design's.
  expect(matched.fonts[0]?.matches[0]?.differences).toEqual({
    family: true,
    weight: -100,
    size: -2,
    lineHeight: -1.6,
  });
});
