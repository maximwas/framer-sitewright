import { describe, expect, it } from "vitest";
import { runOperation } from "../src/operations/define.ts";
import { assertFontVariant, fontFamilies, resolveFontFamily } from "../src/operations/fonts/font-catalog.ts";
import { fontsSearch } from "../src/operations/fonts/search.ts";
import { createFakeRuntime } from "../src/testing/index.ts";

describe("font catalog", () => {
  it("returns the canonical family and explains missing families and variants", async () => {
    const families = await fontFamilies(createFakeRuntime().runtime);

    expect(resolveFontFamily(families, "inter")).toBe("Inter");
    expect(() => resolveFontFamily(families, "Comic")).toThrow(/exact family name/);
    expect(() => assertFontVariant(families, "Inter", 900, "normal")).toThrow(
      /Available: 400 italic, 400 normal, 700 normal/,
    );
  });
});

it("regression: finds a font family by its exact name without loading the whole library (slow through the plugin)", async () => {
  const { runtime } = createFakeRuntime(
    {},
    {
      withAgent: false,
      transport: "plugin",
    },
  );
  const port = runtime.port;

  port.getFonts = async () => {
    throw new Error("the whole library was loaded");
  };

  const found = await runOperation(fontsSearch, { runtime }, { query: "inter" });

  expect(found.fonts).toEqual([
    {
      family: "Inter",
      source: "library",
      variants: [
        {
          weight: 400,
          style: "italic",
        },
        {
          weight: 400,
          style: "normal",
        },
        {
          weight: 700,
          style: "normal",
        },
      ],
    },
  ]);
});
