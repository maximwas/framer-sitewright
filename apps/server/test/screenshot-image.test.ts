import { expect, it } from "vitest";
import { fetchScreenshotImage } from "../src/assets/screenshot-image.ts";

const IMAGE_URL = "https://framerusercontent.com/screenshots/on-demand/shot.jpg";

/** The start of a baseline JPEG: SOI, a JFIF APP0 segment and the SOF0 frame header with the size. */
function jpeg(width: number, height: number): Uint8Array<ArrayBuffer> {
  return new Uint8Array([
    0xff,
    0xd8,
    0xff,
    0xe0,
    0x00,
    0x10,
    ...[0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00],
    0xff,
    0xc0,
    0x00,
    0x11,
    0x08,
    height >> 8,
    height & 0xff,
    width >> 8,
    width & 0xff,
    0x03,
    ...[0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01],
    0xff,
    0xd9,
  ]);
}

/** Framer's CDN: the full page, or scaled so its longer side is `scale-down-to`. */
function fakeCdn(width: number, height: number) {
  const asked: string[] = [];
  const fetchImage = async (input: string | URL | Request) => {
    const url = new URL(String(input));
    const side = Number(url.searchParams.get("scale-down-to") ?? Math.max(width, height));
    const ratio = Math.min(1, side / Math.max(width, height));

    asked.push(url.href);

    return new Response(jpeg(Math.round(width * ratio), Math.round(height * ratio)), {
      headers: { "content-type": "image/jpeg" },
    });
  };

  return {
    asked,
    fetchImage: fetchImage as typeof fetch,
  };
}

it("asks Framer's CDN for a scaled copy of a full page longer than the model takes, and keeps its real size", async () => {
  const cdn = fakeCdn(1200, 10_719);

  const image = await fetchScreenshotImage(IMAGE_URL, cdn.fetchImage);

  expect(cdn.asked).toEqual([IMAGE_URL, `${IMAGE_URL}?scale-down-to=2000`]);
  expect(image).toMatchObject({
    mimeType: "image/jpeg",
    size: {
      width: 1200,
      height: 10_719,
    },
    shown: {
      width: 224,
      height: 2000,
    },
  });
});

it("returns a page that fits as it is, with one request", async () => {
  const cdn = fakeCdn(1200, 1080);

  const image = await fetchScreenshotImage(IMAGE_URL, cdn.fetchImage);

  expect(cdn.asked).toEqual([IMAGE_URL]);
  expect(image.shown).toEqual({
    width: 1200,
    height: 1080,
  });
});
