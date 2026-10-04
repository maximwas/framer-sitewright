/** The largest message the journal panel may send: its calls are small. */
export const WEB_MAX_PAYLOAD_BYTES = 64 * 1024;

/** Content types of the web app's files, by extension. */
export const CONTENT_TYPES: Readonly<Record<string, string>> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".json": "application/json",
  ".woff2": "font/woff2",
};

/** Where Inter comes from: framer.css loads it from Framer's CDN. */
export const FONT_ORIGIN = "https://framerusercontent.com";
