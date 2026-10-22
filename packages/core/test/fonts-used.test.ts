import { expect, it } from "vitest";
import { runOperation } from "../src/operations/define.ts";
import { fontsUsed } from "../src/operations/fonts/used.ts";
import { newTextStyle } from "../src/testing/fake-state.ts";
import { createFakeRuntime } from "../src/testing/index.ts";
import { fontsInUse } from "../src/utils/fonts-used.ts";

it("regression: names text styles by their path and leaves out a font with no family (seen: leaf names and an empty row)", async () => {
  const heading = newTextStyle("style-h1", "/Old/General/Heading");
  const { runtime } = createFakeRuntime(
    {
      textStyles: [
        heading,
        {
          ...newTextStyle("style-blank", "/Blank"),
          font: {
            ...heading.font,
            family: "",
          },
        },
      ],
    },
    {
      withAgent: false,
      transport: "plugin",
    },
  );

  const used = await runOperation(fontsUsed, { runtime }, {});

  expect(used.fonts.map(({ family }) => family)).not.toContain("");
  expect(used.fonts.flatMap(({ textStyles }) => textStyles)).toContain("Old/General/Heading");
});

it("lists each family once with its variants in weight order and where it is used", () => {
  expect(
    fontsInUse([
      {
        font: {
          family: "Inter",
          weight: 600,
          style: "normal",
        },
        where: "Heading 1",
      },
      {
        font: {
          family: "Inter",
          weight: 400,
          style: "normal",
        },
        where: "Body",
      },
      {
        font: {
          family: "Inter",
          weight: 400,
          style: "italic",
        },
        where: "layer",
      },
      {
        font: {
          family: "Archivo",
          weight: null,
          style: null,
        },
        where: "layer",
      },
    ]),
  ).toEqual([
    {
      family: "Archivo",
      variants: ["400"],
      textStyles: [],
      layers: 1,
    },
    {
      family: "Inter",
      variants: ["400", "400 italic", "600"],
      textStyles: ["Body", "Heading 1"],
      layers: 1,
    },
  ]);
});
