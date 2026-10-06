import { expect, it } from "vitest";
import { fontsInUse } from "../src/utils/fonts-used.ts";

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
