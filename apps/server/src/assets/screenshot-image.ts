import { OperationError } from "@sitewright/core";
import { CDN_SCALE_DOWN_PARAM, MAX_IMAGE_SIDE_PX, SCREENSHOT_FETCH_TIMEOUT_MS } from "../constants/mcp.ts";
import { readPngSize } from "../mcp/png-size.ts";
import type { ImageSize, ScreenshotImage } from "../types/mcp.ts";
import { readJpegSize } from "../utils/jpeg-size.ts";

/**
 * Framer's screenshot of a web page, for the model. A full page is often taller than the model takes (10,000 px and
 * more), and nothing here can crop a JPEG: Framer's CDN scales it down to fit instead, so the model sees the whole page
 * small, and the full-size URL stays in the answer for a closer look in a browser.
 */
export async function fetchScreenshotImage(
  imageUrl: string,
  fetchImage: typeof fetch = fetch,
): Promise<ScreenshotImage> {
  const full = await download(imageUrl, fetchImage);
  const size = sizeOf(full.data);

  if (size === null || Math.max(size.width, size.height) <= MAX_IMAGE_SIDE_PX) {
    return {
      ...full,
      size,
      shown: size,
    };
  }

  const scaledUrl = new URL(imageUrl);

  scaledUrl.searchParams.set(CDN_SCALE_DOWN_PARAM, String(MAX_IMAGE_SIDE_PX));

  const scaled = await download(scaledUrl.href, fetchImage);
  const shown = sizeOf(scaled.data);

  if (shown === null || Math.max(shown.width, shown.height) > MAX_IMAGE_SIDE_PX) {
    throw new OperationError(
      "RESULT_TOO_LARGE",
      `The screenshot is ${size.width}×${size.height} px, and Framer's CDN did not scale it down to ${MAX_IMAGE_SIDE_PX} px.`,
      `Open it in a browser instead: ${imageUrl}`,
    );
  }

  return {
    ...scaled,
    size,
    shown,
  };
}

async function download(url: string, fetchImage: typeof fetch): Promise<Pick<ScreenshotImage, "data" | "mimeType">> {
  const response = await fetchImage(url, { signal: AbortSignal.timeout(SCREENSHOT_FETCH_TIMEOUT_MS) });

  if (!response.ok) {
    throw new OperationError(
      "NOT_FOUND",
      `Framer's CDN answered ${response.status} for the screenshot ${url}.`,
      "Take the screenshot again.",
    );
  }

  return {
    data: new Uint8Array(await response.arrayBuffer()),
    mimeType: response.headers.get("content-type")?.split(";")[0]?.trim() ?? "image/jpeg",
  };
}

function sizeOf(data: Uint8Array): ImageSize | null {
  return readJpegSize(data) ?? readPngSize(data);
}
