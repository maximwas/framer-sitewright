import { JPEG_FRAME_MARKERS, JPEG_STANDALONE_MARKERS } from "../constants/mcp.ts";
import type { ImageSize } from "../types/mcp.ts";

/** Width and height from the JPEG's frame header, or null when the data is not a JPEG or the header is missing. */
export function readJpegSize(data: Uint8Array): ImageSize | null {
  if (data.length < 4 || data[0] !== 0xff || data[1] !== 0xd8) {
    return null;
  }

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let offset = 2;

  while (offset + 4 <= data.length) {
    if (data[offset] !== 0xff) {
      return null;
    }

    const marker = view.getUint8(offset + 1);

    // 0xFF fills before a marker.
    if (marker === 0xff) {
      offset += 1;
      continue;
    }

    if (JPEG_STANDALONE_MARKERS.has(marker)) {
      offset += 2;
      continue;
    }

    if (JPEG_FRAME_MARKERS.has(marker)) {
      // Length (2), precision (1), height (2), width (2).
      return offset + 9 <= data.length
        ? {
            width: view.getUint16(offset + 7),
            height: view.getUint16(offset + 5),
          }
        : null;
    }

    offset += 2 + view.getUint16(offset + 2);
  }

  return null;
}
