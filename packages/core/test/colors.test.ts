import { describe, expect, it } from "vitest";
import { normalizeColor } from "../src/utils/color.ts";

describe("normalizeColor", () => {
  it("converts CSS colors into Framer's rgb()/rgba() form", () => {
    expect(normalizeColor("#2563eb")).toBe("rgb(37, 99, 235)");
    expect(normalizeColor("#2563eb80")).toBe("rgba(37, 99, 235, 0.5)");
    expect(normalizeColor("hsl(220 83% 53%)")).toBe("rgb(36, 102, 235)");
    expect(normalizeColor("oklch(0.7 0.4 150)")).toBe("rgb(0, 214, 0)");
  });

  it("rejects unknown colors with an actionable error", () => {
    expect(() => normalizeColor("not-a-color")).toThrow(/Unrecognized color/);
  });
});
