import { OperationError } from "../errors.ts";
import type { CmsItem } from "../types/cms.ts";
import type { CmsFieldData, CmsFieldInput, CmsItemHandle, CollectionHandle } from "../types/framer-port.ts";
import { isPlainObject } from "../utils/guards.ts";

/**
 * The items of the collections that reference fields point at, read once per call: a reference is written by the
 * item's slug (or id) and read back as the slug.
 */
export class CmsItemIndex {
  readonly #collections: readonly CollectionHandle[];
  readonly #items = new Map<string, Promise<readonly CmsItemHandle[]>>();

  constructor(collections: readonly CollectionHandle[]) {
    this.#collections = collections;
  }

  async idOf(field: CmsFieldData, reference: string): Promise<string> {
    const items = await this.#itemsOf(field.collectionId);
    const found = items.find(({ id }) => id === reference) ?? items.find(({ slug }) => slug === reference);

    if (found === undefined) {
      throw new OperationError(
        "INVALID_INPUT",
        `Field ${field.name}: ${this.#nameOf(field.collectionId)} has no item "${reference}".`,
        "Reference items by slug; write the referenced items first.",
      );
    }

    return found.id;
  }

  /** A referenced item's id from its id or slug; null when the collection has no such item. */
  async idOrNull(field: CmsFieldData, reference: string): Promise<string | null> {
    const items = await this.#itemsOf(field.collectionId);

    return (items.find(({ id }) => id === reference) ?? items.find(({ slug }) => slug === reference))?.id ?? null;
  }

  async slugOf(field: CmsFieldData, id: string): Promise<string> {
    const items = await this.#itemsOf(field.collectionId);

    return items.find((item) => item.id === id)?.slug ?? id;
  }

  #itemsOf(collectionId: string | undefined): Promise<readonly CmsItemHandle[]> {
    const key = collectionId ?? "";
    const cached = this.#items.get(key);

    if (cached !== undefined) {
      return cached;
    }

    const collection = this.#collections.find(({ id }) => id === collectionId);
    const items = collection === undefined ? Promise.resolve([]) : collection.getItems();

    this.#items.set(key, items);

    return items;
  }

  #nameOf(collectionId: string | undefined): string {
    return this.#collections.find(({ id }) => id === collectionId)?.name ?? "The referenced collection";
  }
}

/** A value as the tools take it, turned into what Framer takes for the field: enums by case, references by item id. */
export async function toFieldInput(field: CmsFieldData, value: unknown, index: CmsItemIndex): Promise<CmsFieldInput> {
  const wrong = (expected: string) =>
    new OperationError(
      "INVALID_INPUT",
      `Field ${field.name} (${field.type}) takes ${expected}, not ${JSON.stringify(value)}.`,
    );

  switch (field.type) {
    case "string":
    case "formattedText": {
      if (value !== null && typeof value !== "string") {
        throw wrong("text");
      }

      return field.type === "string"
        ? {
            type: "string",
            value: value ?? "",
          }
        : {
            type: "formattedText",
            value: value ?? "",
            contentType: "auto",
          };
    }
    case "number":
      if (typeof value !== "number" || !Number.isFinite(value)) {
        throw wrong("a number");
      }

      return {
        type: "number",
        value,
      };
    case "boolean":
      if (typeof value !== "boolean") {
        throw wrong("true or false");
      }

      return {
        type: "boolean",
        value,
      };
    case "date":
      if (value !== null && (typeof value !== "string" || Number.isNaN(Date.parse(value)))) {
        throw wrong("an ISO date like 2026-10-05, or null");
      }

      return {
        type: "date",
        value,
      };
    case "link":
    case "file":
    case "color":
      if (value !== null && typeof value !== "string") {
        throw wrong(field.type === "color" ? "a CSS color, or null" : "a URL, or null");
      }

      return {
        type: field.type,
        value,
      };
    case "image":
      return imageInput(value, wrong);
    case "enum":
      return {
        type: "enum",
        value: enumCase(field, value),
      };
    case "collectionReference":
      if (value !== null && typeof value !== "string") {
        throw wrong("an item slug, or null");
      }

      return {
        type: "collectionReference",
        value: value === null ? null : await index.idOf(field, value),
      };
    case "multiCollectionReference":
      if (value !== null && !(Array.isArray(value) && value.every((entry) => typeof entry === "string"))) {
        throw wrong("a list of item slugs, or null");
      }

      return {
        type: "multiCollectionReference",
        value: value === null ? null : await Promise.all(value.map((slug: string) => index.idOf(field, slug))),
      };
    default:
      throw new OperationError(
        "INVALID_INPUT",
        `Field ${field.name} is a ${field.type} field, which the CMS tools cannot write.`,
        "Change it in the Framer editor.",
      );
  }
}

/** A value Framer stores, in the shape toFieldInput takes: enums by case name, references by slug, images as URLs. */
async function fromFieldEntry(field: CmsFieldData, value: unknown, index: CmsItemIndex): Promise<unknown> {
  switch (field.type) {
    case "enum":
      return field.cases?.find(({ id }) => id === value)?.name ?? value ?? null;
    case "image":
      return isPlainObject(value) && typeof value.url === "string"
        ? {
            url: value.url,
            ...(typeof value.altText === "string" && value.altText !== "" ? { alt: value.altText } : {}),
          }
        : null;
    case "file":
      return isPlainObject(value) && typeof value.url === "string" ? value.url : null;
    case "color":
      if (isPlainObject(value) && typeof value.name === "string") {
        return { token: value.name };
      }

      return value ?? null;
    case "collectionReference":
      return typeof value === "string" ? index.slugOf(field, value) : null;
    case "multiCollectionReference":
      return Array.isArray(value)
        ? Promise.all(value.filter((id) => typeof id === "string").map((id: string) => index.slugOf(field, id)))
        : [];
    case "array":
      return Array.isArray(value) ? { gallery: value.length } : null;
    default:
      return value ?? null;
  }
}

/** An item with its values by field name. */
export async function itemOf(
  item: CmsItemHandle,
  fields: readonly CmsFieldData[],
  index: CmsItemIndex,
): Promise<CmsItem> {
  const values: Record<string, unknown> = {};

  for (const field of fields) {
    const entry = item.fieldData[field.id];

    if (entry !== undefined) {
      values[field.name] = await fromFieldEntry(field, entry.value, index);
    }
  }

  return {
    slug: item.slug,
    draft: item.draft,
    values,
  };
}

function imageInput(value: unknown, wrong: (expected: string) => OperationError): CmsFieldInput {
  if (value === null || typeof value === "string") {
    return {
      type: "image",
      value,
    };
  }

  if (
    isPlainObject(value) &&
    typeof value.url === "string" &&
    (value.alt === undefined || typeof value.alt === "string")
  ) {
    return {
      type: "image",
      value: value.url,
      ...(typeof value.alt === "string" ? { alt: value.alt } : {}),
    };
  }

  throw wrong('an image URL, { "url", "alt" }, or null');
}

function enumCase(field: CmsFieldData, value: unknown): string {
  const cases = field.cases ?? [];
  const wanted = typeof value === "string" ? value.trim().toLowerCase() : null;
  const found =
    cases.find(({ id }) => id === value) ?? cases.find(({ name }) => wanted !== null && name.toLowerCase() === wanted);

  if (found === undefined) {
    throw new OperationError(
      "INVALID_INPUT",
      `Field ${field.name} takes one of: ${cases.map(({ name }) => name).join(", ")}; not ${JSON.stringify(value)}.`,
    );
  }

  return found.id;
}
