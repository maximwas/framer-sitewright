import { PNG_IHDR_CHUNK, PNG_SIGNATURE } from "../constants/mcp.ts";
import type { ImageSize } from "../types/mcp.ts";

/** Width and height from the IHDR chunk, or null when the data is not a PNG. */
export function readPngSize(data: Uint8Array): ImageSize | null {
  if (data.length < 24 || !PNG_SIGNATURE.every((byte, index) => data[index] === byte)) {
    return null;
  }

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

  if (view.getUint32(12) !== PNG_IHDR_CHUNK) {
    return null;
  }

  return {
    width: view.getUint32(16),
    height: view.getUint32(20),
  };
}
