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
