import { deflateSync } from "node:zlib";
import sharp from "sharp";
import { expect, it } from "vitest";
import { diffEdges, edgesOf } from "../src/images/edge-diff.ts";
import { decodePng } from "../src/images/png-decode.ts";
import { referenceImage } from "../src/images/reference-image.ts";

/** A white RGBA PNG with black horizontal lines at `rows` and vertical ones at `columns`, written with filter "sub". */
function png(width: number, height: number, rows: number[], columns: number[]): Uint8Array {
  const pixels = Buffer.alloc(height * (width * 4 + 1));

  for (let y = 0; y < height; y++) {
    const line = y * (width * 4 + 1);

    pixels[line] = 1;

    let previous = [0, 0, 0, 0];

    for (let x = 0; x < width; x++) {
      const dark = rows.includes(y) || columns.includes(x);
      const color = dark ? [0, 0, 0, 255] : [255, 255, 255, 255];

      color.forEach((value, channel) => {
        pixels[line + 1 + x * 4 + channel] = (value - (previous[channel] ?? 0)) & 0xff;
      });
      previous = color;
    }
  }

  const chunk = (type: string, body: Buffer) => {
    const head = Buffer.alloc(8);

    head.writeUInt32BE(body.length);
    head.write(type, 4, "ascii");

    return Buffer.concat([head, body, Buffer.alloc(4)]);
  };
  const header = Buffer.alloc(13);

  header.writeUInt32BE(width);
  header.writeUInt32BE(height, 4);
  header.set([8, 6, 0, 0, 0], 8);

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(pixels)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// Lining a node up with a Figma export meant scanning pixel rows by hand (seen 12.10.2026).
it("finds the lines and edges where a node and its reference differ, row by row and column by column", () => {
  const node = edgesOf(decodePng(png(60, 60, [20, 41], [10])));
  const reference = edgesOf(decodePng(png(60, 60, [20, 40], [10, 30])));

  // A 1px line counts once: its top and the row under it are one run.
  expect(node.rows).toEqual([20, 41]);

  const rows = diffEdges(reference.rows, node.rows);
  const columns = diffEdges(reference.columns, node.columns);

  expect(rows.matched).toBe(1);
  expect(rows.shifted).toEqual([
    {
      reference: 40,
      node: 41,
      by: 1,
    },
  ]);
  expect(columns.missing).toEqual([30]);
  expect(columns.extra).toEqual([]);
});

it("regression: lines up a part of a wider design with the capture (seen: a 1440 reference could not be compared with a 1200 section)", async () => {
  // A 120 px wide design with its container from x 20 to 100 (80 px), a line across it at y 30; the capture is 40 px.
  const raw = Buffer.alloc(120 * 60 * 4, 255);

  raw.fill(0, 30 * 120 * 4, 31 * 120 * 4);

  for (let x = 0; x < 120; x++) {
    raw[(30 * 120 + x) * 4 + 3] = 255;
  }

  const design = new Uint8Array(
    await sharp(raw, {
      raw: {
        width: 120,
        height: 60,
        channels: 4,
      },
    })
      .png()
      .toBuffer(),
  );
  const reference = await referenceImage(design, {
    clip: {
      x: 20,
      y: 0,
      width: 80,
      height: 60,
    },
    width: 40,
  });

  expect([reference.width, reference.height]).toEqual([40, 30]);

  // Halving blurs the 1px line over two rows: its edge lands within a pixel of y 15.
  const [edge, ...more] = edgesOf(reference).rows;

  expect(more).toEqual([]);
  expect(Math.abs((edge ?? 0) - 15)).toBeLessThanOrEqual(1);
});
