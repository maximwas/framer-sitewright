import { describe, expect, it } from "vitest";
import { assertFontVariant, fontFamilies, resolveFontFamily } from "../src/operations/fonts/font-catalog.ts";
import { createFakeRuntime } from "../src/testing/index.ts";

describe("font catalog", () => {
  it("returns the canonical family and explains missing families and variants", async () => {
    const families = await fontFamilies(createFakeRuntime().runtime);

    expect(resolveFontFamily(families, "inter")).toBe("Inter");
    expect(() => resolveFontFamily(families, "Comic")).toThrow(/fonts_search/);
    expect(() => assertFontVariant(families, "Inter", 900, "normal")).toThrow(
      /Available: 400 italic, 400 normal, 700 normal/,
    );
  });
});
