import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { OperationError } from "@sitewright/core";
import sharp from "sharp";
import { IMAGE_UPLOAD_MAX_BYTES } from "../constants/assets.ts";
import type { RgbaImage } from "../types/images.ts";

/** A reference image's bytes, from an https URL or a local path (relative to the folder the server runs in). */
export async function referenceBytes(reference: string): Promise<Uint8Array> {
  if (reference.startsWith("https://")) {
    const response = await fetch(reference);

    if (!response.ok) {
      throw new OperationError("NOT_FOUND", `${reference} answered ${response.status}.`);
    }

    return new Uint8Array(await response.arrayBuffer());
  }

  const bytes = await readFile(resolve(reference)).catch(() => {
    throw new OperationError(
      "INVALID_INPUT",
      `"${reference}" is neither a readable image file nor an https URL.`,
      `Pass the exported PNG's path, absolute or relative to ${process.cwd()}.`,
    );
  });

  if (bytes.length > IMAGE_UPLOAD_MAX_BYTES) {
    throw new OperationError("INVALID_INPUT", "The reference image is larger than 10 MB.");
  }

  return new Uint8Array(bytes);
}

/**
 * The reference as the capture is compared with: `clip` cuts the part that matches the node (a container of a wider
 * design), in the reference's px, and `width` then scales it to the capture's width, so a 1440 design lines up with a
 * 1200 breakpoint's section.
 */
export async function referenceImage(
  bytes: Uint8Array,
  {
    clip,
    width,
  }: { clip?: { x: number; y: number; width: number; height: number } | undefined; width?: number | undefined },
): Promise<RgbaImage> {
  let image = sharp(bytes);

  if (clip !== undefined) {
    image = image.extract({
      left: Math.round(clip.x),
      top: Math.round(clip.y),
      width: Math.round(clip.width),
      height: Math.round(clip.height),
    });
  }

  if (width !== undefined) {
    image = image.resize({ width });
  }

  const { data, info } = await image
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
    .catch((error: unknown) => {
      throw new OperationError(
        "INVALID_INPUT",
        `The reference could not be read or cut: ${error instanceof Error ? error.message : String(error)}.`,
        "Pass a PNG or JPEG, and a referenceClip inside its size.",
      );
    });

  return {
    width: info.width,
    height: info.height,
    data: new Uint8Array(data),
  };
}
