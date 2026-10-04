import { readFile, realpath, stat } from "node:fs/promises";
import { extname, isAbsolute } from "node:path";
import { OperationError, SVG_DATA_URL_PREFIX } from "@sitewright/core";
import { IMAGE_MIME_TYPES, IMAGE_UPLOAD_MAX_BYTES } from "../constants/assets.ts";
import type { ImageSource } from "../types/assets.ts";
import { hasImageSignature } from "../utils/image-signature.ts";

/** What uploadImage takes: an https URL as is, a local file or SVG markup as a data URL. */
export async function imageSourceOf(source: ImageSource): Promise<string> {
  const given = [source.url, source.path, source.svg].filter((value) => value !== undefined);

  if (given.length !== 1) {
    throw new OperationError("INVALID_INPUT", "Pass exactly one of url, path or svg.");
  }

  if (source.svg !== undefined) {
    return `${SVG_DATA_URL_PREFIX}${Buffer.from(source.svg).toString("base64")}`;
  }

  if (source.url !== undefined) {
    if (!source.url.startsWith("https://")) {
      throw new OperationError("INVALID_INPUT", "The image url must start with https://.");
    }

    return source.url;
  }

  return fileDataUrl(source.path ?? "");
}

/**
 * A local image as a data URL. The upload lands on Framer's public CDN, so only a real image goes: the extension is
 * checked on the file a symlink leads to, and the bytes must start like that type of image.
 */
async function fileDataUrl(path: string): Promise<string> {
  const notAnImage = () =>
    new OperationError(
      "INVALID_INPUT",
      `"${path}" is not an absolute path to an image file.`,
      `Use an absolute path ending in ${Object.keys(IMAGE_MIME_TYPES).join(", ")}.`,
    );

  if (!isAbsolute(path) || IMAGE_MIME_TYPES[extname(path).toLowerCase()] === undefined) {
    throw notAnImage();
  }

  const real = await realpath(path);
  const mimeType = IMAGE_MIME_TYPES[extname(real).toLowerCase()];

  if (mimeType === undefined) {
    throw notAnImage();
  }

  const size = (await stat(real)).size;

  if (size > IMAGE_UPLOAD_MAX_BYTES) {
    throw new OperationError(
      "INVALID_INPUT",
      `The image is ${Math.round(size / 1024 / 1024)} MB; the limit is ${IMAGE_UPLOAD_MAX_BYTES / 1024 / 1024} MB.`,
    );
  }

  const bytes = await readFile(real);

  if (!hasImageSignature(mimeType, bytes)) {
    throw new OperationError("INVALID_INPUT", `"${path}" does not hold a ${mimeType} image.`);
  }

  return `data:${mimeType};base64,${bytes.toString("base64")}`;
}
