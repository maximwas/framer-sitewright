/** Group kinds Framer localizes: pages, CMS collections and items, components, templates and the site settings. */
export const LOCALIZATION_GROUP_TYPES = [
  "page",
  "collection",
  "collection-item",
  "component",
  "template",
  "settings",
] as const;

/** Sources localization_get returns at once by default, and at most. */
export const LOCALIZATION_PAGE = 100;
export const LOCALIZATION_PAGE_MAX = 500;

/** Translations one localization_set writes. */
export const LOCALIZATION_SET_MAX = 500;

export const LOCALIZATION_UNDO_NOTE = "Undo does not restore translations yet; the previous values are in the result.";

/** A locale code with its region, "nl-BE" or "pt_BR": a language and a region locale_add can take apart. */
export const REGIONAL_LOCALE_CODE = /^([a-z]{2,3})[-_]([a-z]{2}|\d{3})$/i;

export const LOCALE_UNDO_NOTE =
  "Undo does not remove a locale: the user removes it in the Framer editor (Localization).";

/** Framer's refusal of translations to a plugin that runs on the canvas, not in its Localization mode. */
export const CANVAS_MODE_REFUSAL = /is not allowed while in mode/i;
