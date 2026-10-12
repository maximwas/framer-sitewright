import { readFile } from "node:fs/promises";
import { isAbsolute } from "node:path";
import { OperationError } from "@sitewright/core";
import { IMAGE_UPLOAD_MAX_BYTES } from "../constants/assets.ts";

/** A reference image's bytes, from an absolute local path or an https URL. */
export async function referenceBytes(reference: string): Promise<Uint8Array> {
  if (reference.startsWith("https://")) {
    const response = await fetch(reference);

    if (!response.ok) {
      throw new OperationError("NOT_FOUND", `${reference} answered ${response.status}.`);
    }

    return new Uint8Array(await response.arrayBuffer());
  }

  if (!isAbsolute(reference)) {
    throw new OperationError(
      "INVALID_INPUT",
      `"${reference}" is neither an absolute path nor an https URL.`,
      "Pass the absolute path of the exported PNG.",
    );
  }

  const bytes = await readFile(reference);

  if (bytes.length > IMAGE_UPLOAD_MAX_BYTES) {
    throw new OperationError("INVALID_INPUT", "The reference image is larger than 10 MB.");
  }

  return new Uint8Array(bytes);
}
