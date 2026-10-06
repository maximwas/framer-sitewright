import type {
  CmsFieldData,
  CmsFieldInput,
  CmsItemHandle,
  CmsListItemFieldInput,
  CmsListItemInput,
  CollectionHandle,
} from "../types/framer-port.ts";
import type { CmsItemState, CmsItemStep } from "../types/history.ts";
import { isListItemInput } from "../utils/cms.ts";
import { isPlainObject } from "../utils/guards.ts";
import type { CmsItemIndex } from "./values.ts";

/**
 * An item as undo can write it back, its values in addItems' shape. A value undo cannot write (a color bound to a
 * token) is left out, so undo leaves that field as it is.
 */
export async function cmsItemState(
  collection: CollectionHandle,
  fields: readonly CmsFieldData[],
  item: CmsItemHandle,
  index: CmsItemIndex,
): Promise<CmsItemState> {
  const fieldData: Record<string, CmsFieldInput> = {};

  for (const field of fields) {
    const entry = item.fieldData[field.id];
    const input =
      entry === undefined ? null : writableEntry(entry.type, await writableValue(field, entry.value, index));

    if (input !== null) {
      fieldData[field.id] = input;
    }
  }

  return {
    path: `${collection.name}/${item.slug}`,
    collectionId: collection.id,
    slug: item.slug,
    draft: item.draft,
    fieldData,
  };
}

export function cmsItemStep(id: string, before: CmsItemState | null, after: CmsItemState | null): CmsItemStep {
  return {
    kind: "cms-item",
    id,
    before,
    after,
  };
}

/**
 * A value as addItems takes it back: an enum by its case id, a reference by the item id. Framer reads an enum as the
 * case's name and a reference as the item's slug (checked on the Server API, 05.10.2026), though it only takes ids.
 */
async function writableValue(field: CmsFieldData, value: unknown, index: CmsItemIndex): Promise<unknown> {
  if (field.type === "enum") {
    return field.cases?.find(({ id, name }) => id === value || name === value)?.id ?? value;
  }

  if (field.type === "collectionReference" && typeof value === "string") {
    return (await index.idOrNull(field, value)) ?? value;
  }

  if (field.type === "multiCollectionReference" && Array.isArray(value)) {
    return Promise.all(
      value.map(async (reference) =>
        typeof reference === "string" ? ((await index.idOrNull(field, reference)) ?? reference) : reference,
      ),
    );
  }

  return value;
}

/** A stored value in the shape addItems takes it back; null for what it cannot take. */
function writableEntry(type: string, value: unknown): CmsFieldInput | null {
  switch (type) {
    case "string":
    case "enum":
      return typeof value === "string"
        ? {
            type,
            value,
          }
        : null;
    case "formattedText":
      return typeof value === "string"
        ? {
            type,
            value,
            contentType: "html",
          }
        : null;
    case "number":
      return typeof value === "number"
        ? {
            type,
            value,
          }
        : null;
    case "boolean":
      return typeof value === "boolean"
        ? {
            type,
            value,
          }
        : null;
    case "date":
    case "link":
    case "collectionReference":
      return {
        type,
        value: typeof value === "string" ? value : null,
      };
    case "color":
      // A color bound to a token comes as the token itself, which addItems cannot take back.
      return typeof value === "string" || value === undefined || value === null
        ? {
            type,
            value: typeof value === "string" ? value : null,
          }
        : null;
    case "image":
      return isPlainObject(value) && typeof value.url === "string"
        ? {
            type,
            value: value.url,
            ...(typeof value.altText === "string" && value.altText !== "" ? { alt: value.altText } : {}),
          }
        : {
            type,
            value: null,
          };
    case "file":
      return {
        type,
        value: isPlainObject(value) && typeof value.url === "string" ? value.url : null,
      };
    case "multiCollectionReference":
      return {
        type,
        value: Array.isArray(value) ? value.filter((id) => typeof id === "string") : null,
      };
    case "array":
      return {
        type,
        value: Array.isArray(value) ? value.map(writableListItem) : [],
      };
    default:
      return null;
  }
}

/**
 * A List entry as addItems takes it back, without its id: Framer gives entries new ids on every write, and the
 * journal compares items by their values.
 */
function writableListItem(entry: unknown): CmsListItemInput {
  const stored = isPlainObject(entry) && isPlainObject(entry.fieldData) ? entry.fieldData : {};
  const fieldData: Record<string, CmsListItemFieldInput> = {};

  for (const [id, nested] of Object.entries(stored)) {
    const input =
      isPlainObject(nested) && typeof nested.type === "string" ? writableEntry(nested.type, nested.value) : null;

    if (input !== null && isListItemInput(input)) {
      fieldData[id] = input;
    }
  }

  return { fieldData };
}
