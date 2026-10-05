import { readFile, realpath, stat } from "node:fs/promises";
import { extname, isAbsolute } from "node:path";
import { OperationError } from "@sitewright/core";
import { FILE_MIME_TYPES, FILE_UPLOAD_MAX_BYTES } from "../constants/assets.ts";
import type { FileSource } from "../types/assets.ts";
import { hasFileSignature } from "../utils/file-signature.ts";

/** What uploadFile takes: an https URL as is, a local file as a data URL. */
export async function fileSourceOf(source: FileSource): Promise<string> {
  if ((source.url === undefined) === (source.path === undefined)) {
    throw new OperationError("INVALID_INPUT", "Pass exactly one of url or path.");
  }

  if (source.url !== undefined) {
    if (!source.url.startsWith("https://")) {
      throw new OperationError("INVALID_INPUT", "The file url must start with https://.");
    }

    return source.url;
  }

  return fileDataUrl(source.path ?? "");
}

/**
 * A local file as a data URL. The upload lands on Framer's public CDN, so only a file of a listed type goes: the
 * extension is checked on the file a symlink leads to, and the bytes must start like that type.
 */
async function fileDataUrl(path: string): Promise<string> {
  const notAllowed = () =>
    new OperationError(
      "INVALID_INPUT",
      `"${path}" is not an absolute path to a video, PDF or font file.`,
      `Use an absolute path ending in ${Object.keys(FILE_MIME_TYPES).join(", ")}.`,
    );

  if (!isAbsolute(path) || FILE_MIME_TYPES[extname(path).toLowerCase()] === undefined) {
    throw notAllowed();
  }

  const real = await realpath(path);
  const mimeType = FILE_MIME_TYPES[extname(real).toLowerCase()];

  if (mimeType === undefined) {
    throw notAllowed();
  }

  const size = (await stat(real)).size;

  if (size > FILE_UPLOAD_MAX_BYTES) {
    throw new OperationError(
      "INVALID_INPUT",
      `The file is ${Math.round(size / 1024 / 1024)} MB; the limit is ${FILE_UPLOAD_MAX_BYTES / 1024 / 1024} MB.`,
    );
  }

  const bytes = await readFile(real);

  if (!hasFileSignature(mimeType, bytes)) {
    throw new OperationError("INVALID_INPUT", `"${path}" does not hold a ${mimeType} file.`);
  }

  return `data:${mimeType};base64,${bytes.toString("base64")}`;
}
