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

/** Files file_upload reads from disk, by extension: media for code components, documents and fonts. */
export const FILE_MIME_TYPES: Readonly<Record<string, string>> = {
  ".mp4": "video/mp4",
  ".m4v": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".pdf": "application/pdf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
};

/** A bigger local file is refused: it travels base64-encoded in one message to Framer. */
export const FILE_UPLOAD_MAX_BYTES = 50 * 1024 * 1024;
