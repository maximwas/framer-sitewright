import sharp from "sharp";
import { expect, it } from "vitest";
import { assertFitsModel } from "../src/mcp/tools/screenshot.ts";

it("regression: a capture too big at scale 0.5 is told to go in parts, not to use scale 0.5 (seen: that hint at 0.5)", async () => {
  const png = new Uint8Array(
    await sharp({
      create: {
        width: 1200,
        height: 4200,
        channels: 3,
        background: "#ffffff",
      },
    })
      .png()
      .toBuffer(),
  );

  expect(() => assertFitsModel(png, 0.5)).toThrow(
    expect.objectContaining({ hint: expect.not.stringContaining("scale 0.5") }),
  );
  expect(() => assertFitsModel(png, 1)).toThrow(
    expect.objectContaining({ hint: expect.stringContaining("scale 0.5") }),
  );
});
