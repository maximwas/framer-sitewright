import { inflateSync } from "node:zlib";
import { OperationError } from "@sitewright/core";
import { PNG_SIGNATURE } from "../constants/mcp.ts";
import type { RgbaImage } from "../types/images.ts";

/**
 * A PNG as RGBA: 8-bit gray, gray with alpha, RGB, RGBA or palette, not interlaced, which is what Framer's screenshots
 * and Figma's exports are. Anything else is refused with what to export instead.
 */
export function decodePng(file: Uint8Array): RgbaImage {
  if (file.length < 8 || !PNG_SIGNATURE.every((byte, index) => file[index] === byte)) {
    throw unsupported("The file is not a PNG.");
  }

  const view = new DataView(file.buffer, file.byteOffset, file.byteLength);
  const idat: Uint8Array[] = [];
  let width = 0;
  let height = 0;
  let colorType = 0;
  let palette: Uint8Array | null = null;
  let transparency: Uint8Array | null = null;

  for (let offset = 8; offset + 8 <= file.length; ) {
    const length = view.getUint32(offset);
    const type = String.fromCharCode(...file.subarray(offset + 4, offset + 8));
    const body = file.subarray(offset + 8, offset + 8 + length);

    if (type === "IHDR") {
      width = view.getUint32(offset + 8);
      height = view.getUint32(offset + 12);
      colorType = body[9] ?? 0;

      if (body[8] !== 8 || body[12] !== 0) {
        throw unsupported("Only 8-bit, non-interlaced PNGs are read.");
      }
    } else if (type === "PLTE") {
      palette = body;
    } else if (type === "tRNS") {
      transparency = body;
    } else if (type === "IDAT") {
      idat.push(body);
    } else if (type === "IEND") {
      break;
    }

    offset += 12 + length;
  }

  const channels = {
    0: 1,
    2: 3,
    3: 1,
    4: 2,
    6: 4,
  }[colorType];

  if (channels === undefined || width === 0 || height === 0) {
    throw unsupported("The PNG's color type is not read.");
  }

  const raw = unfilter(inflateSync(Buffer.concat(idat)), width, height, channels);
  const data = new Uint8Array(width * height * 4);

  for (let pixel = 0; pixel < width * height; pixel++) {
    const at = pixel * channels;
    const [r, g, b, a] = rgbaOf(raw, at, colorType, palette, transparency);

    data.set([r, g, b, a], pixel * 4);
  }

  return {
    width,
    height,
    data,
  };
}

/** Undoes the per-row filters (none, sub, up, average, Paeth). */
function unfilter(raw: Uint8Array, width: number, height: number, channels: number): Uint8Array {
  const stride = width * channels;
  const out = new Uint8Array(stride * height);

  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)] ?? 0;
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));

    for (let x = 0; x < stride; x++) {
      const left = x >= channels ? (out[y * stride + x - channels] ?? 0) : 0;
      const up = y > 0 ? (out[(y - 1) * stride + x] ?? 0) : 0;
      const corner = x >= channels && y > 0 ? (out[(y - 1) * stride + x - channels] ?? 0) : 0;
      const predicted = [0, left, up, (left + up) >> 1, paeth(left, up, corner)][filter] ?? 0;

      out[y * stride + x] = ((line[x] ?? 0) + predicted) & 0xff;
    }
  }

  return out;
}

function paeth(left: number, up: number, corner: number): number {
  const estimate = left + up - corner;
  const toLeft = Math.abs(estimate - left);
  const toUp = Math.abs(estimate - up);
  const toCorner = Math.abs(estimate - corner);

  if (toLeft <= toUp && toLeft <= toCorner) {
    return left;
  }

  return toUp <= toCorner ? up : corner;
}

function rgbaOf(
  raw: Uint8Array,
  at: number,
  colorType: number,
  palette: Uint8Array | null,
  transparency: Uint8Array | null,
): [number, number, number, number] {
  const byte = (index: number) => raw[at + index] ?? 0;

  switch (colorType) {
    case 0:
      return [byte(0), byte(0), byte(0), 255];
    case 4:
      return [byte(0), byte(0), byte(0), byte(1)];
    case 2:
      return [byte(0), byte(1), byte(2), 255];
    case 3: {
      const entry = byte(0);

      return [
        palette?.[entry * 3] ?? 0,
        palette?.[entry * 3 + 1] ?? 0,
        palette?.[entry * 3 + 2] ?? 0,
        transparency?.[entry] ?? 255,
      ];
    }
    default:
      return [byte(0), byte(1), byte(2), byte(3)];
  }
}

function unsupported(reason: string): OperationError {
  return new OperationError("INVALID_INPUT", reason, "Export the reference as an 8-bit PNG (Figma: Export, PNG).");
}
