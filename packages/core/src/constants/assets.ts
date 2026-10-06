/** Where custom HTML goes in every page of the site. */
export const CUSTOM_CODE_LOCATIONS = ["headStart", "headEnd", "bodyStart", "bodyEnd"] as const;

/** Image shapes Unsplash search can be asked for. */
export const IMAGE_ORIENTATIONS = ["landscape", "portrait", "squarish"] as const;

/** The icon sets group the catalog lists them in. */
export const ICON_SET_GROUPS = ["project", "external", "additional"] as const;

/** Icon names in one icons_search answer: sets hold over a thousand. */
export const ICON_SEARCH_MAX_NAMES = 60;

/** A data URL prefix for inline SVG markup, which uploadImage takes like any image. */
export const SVG_DATA_URL_PREFIX = "data:image/svg+xml;base64,";

/**
 * The longest data URL file_upload sends through the plugin bridge (MAX_MESSAGE_BYTES, 4 MiB per message, with room
 * for the rest of the message); a longer one goes through the Server API.
 */
export const FILE_DATA_URL_BRIDGE_MAX = 3_500_000;

/**
 * Control fields that take an image (alone, in a list, or in a list's entries) in Marketplace components: Framer keeps
 * there only an uploaded image, and drops a URL without a word (seen 06.10.2026 on 7 of 8 popular carousels).
 */
export const IMAGE_CONTROL_KEYS: ReadonlySet<string> = new Set([
  "image",
  "images",
  "photo",
  "photos",
  "picture",
  "pictures",
  "poster",
  "thumbnail",
  "avatar",
  "logo",
  "logos",
  "cover",
  "background",
  "backgroundImage",
]);
