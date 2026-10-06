/** The field types a List (array) field can nest: Framer nests no enums, references or Lists. */
export const CMS_LIST_ITEM_FIELD_TYPES = [
  "string",
  "formattedText",
  "number",
  "boolean",
  "date",
  "link",
  "image",
  "file",
  "color",
] as const;

/** Field types the CMS tools can add and write; dividers stay with the editor. */
export const CMS_FIELD_TYPES = [
  ...CMS_LIST_ITEM_FIELD_TYPES,
  "enum",
  "collectionReference",
  "multiCollectionReference",
  "array",
] as const;

/**
 * The field a new collection gets first. Framer's Plugin API makes a collection with only a slug, and Framer names
 * items and builds their slugs from the first string field (seen 06.10.2026).
 */
export const CMS_TITLE_FIELD = "Title";

/** Names of a string field that already serves as the title, in lower case. */
export const CMS_TITLE_NAMES = ["title", "name"];

/** Items cms_items_list returns at once by default, and at most. */
export const CMS_ITEMS_PAGE = 50;
export const CMS_ITEMS_PAGE_MAX = 200;

/** Items one cms_items_upsert writes: one addItems call, small enough for the bridge. */
export const CMS_UPSERT_MAX = 100;

/** What a file field accepts when the call names no types. */
export const CMS_DEFAULT_FILE_TYPES = ["*"];

export const CMS_UNDO_NOTE = "Undo does not restore CMS collections, fields or the order of items yet.";

/** How deep the search for layers bound to a field reads each page: collection cards sit deep. */
export const CMS_BINDING_DEPTH = 40;

/** Layers named per page when a field is bound; the rest are counted. */
export const CMS_BINDING_LAYERS_MAX = 10;

export const CMS_BINDINGS_UNCHECKED =
  "Without a Server API key the canvas could not be searched for layers bound to the removed fields: a layer bound to one now shows Framer's placeholder “Content”.";
