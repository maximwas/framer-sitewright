import { CMS_DEFAULT_FILE_TYPES } from "../constants/cms.ts";
import { OperationError } from "../errors.ts";
import type { CmsCollectionSummary, CmsFieldSpec, CmsFieldSummary } from "../types/cms.ts";
import type { CmsFieldCreate, CmsFieldData, CollectionHandle, FramerPort } from "../types/framer-port.ts";

const LIST_HINT = "List them with cms_collections_list.";

/** A collection by id or name (any case). */
export function findCollection(collections: readonly CollectionHandle[], query: string): CollectionHandle {
  const wanted = query.trim().toLowerCase();
  const found =
    collections.find((collection) => collection.id === query) ??
    collections.find((collection) => collection.name.toLowerCase() === wanted);

  if (found === undefined) {
    throw new OperationError(
      "NOT_FOUND",
      collections.length === 0
        ? `No CMS collection "${query}": the project has none.`
        : `No CMS collection "${query}". Collections: ${collections.map(({ name }) => name).join(", ")}.`,
      LIST_HINT,
    );
  }

  return found;
}

/** The collection to write to: one a sync plugin manages, or a read-only one, refuses edits. */
export async function editableCollection(port: FramerPort, query: string): Promise<CollectionHandle> {
  const collection = findCollection(await port.getCollections(), query);

  if (!isEditable(collection)) {
    throw new OperationError(
      "PERMISSION_DENIED",
      `The CMS collection ${collection.name} is managed by a plugin or read-only.`,
      "Change it in the plugin that syncs it.",
    );
  }

  return collection;
}

function isEditable(collection: CollectionHandle): boolean {
  return !collection.readonly && collection.managedBy === "user";
}

/** A field by name (any case) or id. */
export function findField(fields: readonly CmsFieldData[], query: string, collection: string): CmsFieldData {
  const wanted = query.trim().toLowerCase();
  const found =
    fields.find((field) => field.id === query) ?? fields.find((field) => field.name.toLowerCase() === wanted);

  if (found === undefined) {
    throw new OperationError(
      "INVALID_INPUT",
      `${collection} has no field "${query}". Fields: ${fields.map(({ name }) => name).join(", ") || "none"}.`,
      "Add it with cms_fields_set.",
    );
  }

  return found;
}

/** A field as the tools show it: cases by name, a reference by its collection's name. */
function fieldSummary(field: CmsFieldData, collections: readonly CollectionHandle[]): CmsFieldSummary {
  const target =
    field.collectionId === undefined
      ? undefined
      : (collections.find(({ id }) => id === field.collectionId)?.name ?? field.collectionId);

  return {
    name: field.name,
    type: field.type,
    ...(field.cases === undefined ? {} : { cases: field.cases.map(({ name }) => name) }),
    ...(target === undefined ? {} : { collection: target }),
  };
}

export async function collectionSummary(
  collection: CollectionHandle,
  collections: readonly CollectionHandle[],
): Promise<CmsCollectionSummary> {
  const [fields, items] = await Promise.all([collection.getFields(), collection.getItems()]);

  return {
    id: collection.id,
    name: collection.name,
    editable: isEditable(collection),
    items: items.length,
    fields: fields.map((field) => fieldSummary(field, collections)),
  };
}

/** What addFields takes for a field spec: a reference's collection resolved to its id. */
export function fieldCreate(spec: CmsFieldSpec, collections: readonly CollectionHandle[]): CmsFieldCreate {
  const { name, type } = spec;

  switch (type) {
    case "enum":
      if (spec.cases === undefined) {
        throw new OperationError("INVALID_INPUT", `The enum field ${name} needs its cases.`);
      }

      return {
        type,
        name,
        cases: spec.cases.map((option) => ({ name: option })),
      };
    case "collectionReference":
    case "multiCollectionReference":
      if (spec.collection === undefined) {
        throw new OperationError("INVALID_INPUT", `The reference field ${name} needs the collection it points at.`);
      }

      return {
        type,
        name,
        collectionId: findCollection(collections, spec.collection).id,
      };
    case "file":
      return {
        type,
        name,
        allowedFileTypes: spec.allowedFileTypes ?? CMS_DEFAULT_FILE_TYPES,
      };
    default:
      return {
        type,
        name,
      };
  }
}
