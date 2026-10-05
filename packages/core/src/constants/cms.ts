/** Field types the CMS tools can add and write; gallery (array) fields and dividers stay with the editor. */
export const CMS_FIELD_TYPES = [
  "string",
  "formattedText",
  "number",
  "boolean",
  "date",
  "link",
  "image",
  "file",
  "color",
  "enum",
  "collectionReference",
  "multiCollectionReference",
] as const;

/** Items cms_items_list returns at once by default, and at most. */
export const CMS_ITEMS_PAGE = 50;
export const CMS_ITEMS_PAGE_MAX = 200;

/** Items one cms_items_upsert writes: one addItems call, small enough for the bridge. */
export const CMS_UPSERT_MAX = 100;

/** What a file field accepts when the call names no types. */
export const CMS_DEFAULT_FILE_TYPES = ["*"];

export const CMS_UNDO_NOTE = "Undo does not restore CMS collections, fields or items yet.";
