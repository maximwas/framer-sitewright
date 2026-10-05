import { expect, it } from "vitest";
import { parseLinearGradient } from "../src/utils/gradient.ts";

it("reads a CSS linear gradient as Framer's stops: angles, directions, rgba commas and missing positions", () => {
  expect(parseLinearGradient("linear-gradient(180deg, rgba(0, 0, 0, 0.5) 0%, #fff 100%)")).toEqual({
    kind: "linear",
    angle: 180,
    stops: [
      {
        color: "rgba(0, 0, 0, 0.5)",
        position: 0,
      },
      {
        color: "#fff",
        position: 1,
      },
    ],
  });
  expect(parseLinearGradient("linear-gradient(to right, var(--token-a), #000 40%, #111)")?.stops).toEqual([
    {
      color: "var(--token-a)",
      position: 0,
    },
    {
      color: "#000",
      position: 0.4,
    },
    {
      color: "#111",
      position: 1,
    },
  ]);
  expect(parseLinearGradient("linear-gradient(to right, red, blue)")?.angle).toBe(90);
  expect(parseLinearGradient("linear-gradient(red, blue, green)")?.stops.map(({ position }) => position)).toEqual([
    0, 0.5, 1,
  ]);
  expect(parseLinearGradient("radial-gradient(circle, red, blue)")).toBeNull();
});
