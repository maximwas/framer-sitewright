import { expect, it } from "vitest";
import { hexToHsl, hslToHex, paletteOf } from "../src/utils/palette.ts";

it("round-trips colors through HSL and turns the hue for each scheme", () => {
  expect(
    hslToHex(
      hexToHsl("#1d4a66") ?? {
        h: 0,
        s: 0,
        l: 0,
      },
    ),
  ).toBe("#1d4a66");
  expect(paletteOf("#ff0000", "complementary")?.slice(0, 2)).toEqual(["#ff0000", "#00ffff"]);
  expect(paletteOf("#ff0000", "triadic")?.slice(0, 3)).toEqual(["#ff0000", "#00ff00", "#0000ff"]);
  expect(paletteOf("blue", "triadic")).toBeNull();
});
