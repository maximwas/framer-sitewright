import { expect, it } from "vitest";
import { fittedWindow } from "../src/utils/window-options.ts";

it("regression: the folded window shrinks to its bar (seen: Framer kept the height of a window resizable by height)", () => {
  const options = fittedWindow(53, 420.4);

  expect(options.height).toBe(54);
  expect(options.width).toBe(420);
  // Framer keeps the height the user can drag, so a later showUI height applies only without height resizing.
  expect(options.resizable).toBe("width");
});
