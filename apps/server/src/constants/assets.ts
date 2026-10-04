/** Image files image_upload reads from disk, by extension. */
export const IMAGE_MIME_TYPES: Readonly<Record<string, string>> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
};

/** A bigger local file is refused: it would travel base64-encoded in one message. */
export const IMAGE_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;
