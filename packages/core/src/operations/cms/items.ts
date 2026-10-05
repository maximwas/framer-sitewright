import * as z from "zod";
import { editableCollection, findCollection, findField } from "../../cms/collections.ts";
import { CmsItemIndex, itemOf, toFieldInput } from "../../cms/values.ts";
import { CMS_ITEMS_PAGE, CMS_ITEMS_PAGE_MAX, CMS_UNDO_NOTE, CMS_UPSERT_MAX } from "../../constants/cms.ts";
import { CmsItemSchema } from "../../schemas/cms.ts";
import type { CmsFieldInput, CmsItemWrite } from "../../types/framer-port.ts";
import { countOf } from "../../utils/text.ts";
import { defineOperation } from "../define.ts";

const CollectionInput = z.string().min(1).describe("Collection name or id.");

export const cmsItemsList = defineOperation({
  name: "cms.items.list",
  effect: "read",
  idempotent: true,
  permissions: [],
  input: z.strictObject({
    collection: CollectionInput,
    offset: z.number().int().min(0).default(0),
    limit: z.number().int().min(1).max(CMS_ITEMS_PAGE_MAX).default(CMS_ITEMS_PAGE),
  }),
  output: z.object({
    collection: z.string(),
    total: z.number().int(),
    items: z.array(CmsItemSchema),
  }),
  async run({ runtime }, { collection: query, offset, limit }) {
    const collections = await runtime.port.getCollections();
    const collection = findCollection(collections, query);
    const [fields, items] = await Promise.all([collection.getFields(), collection.getItems()]);
    const index = new CmsItemIndex(collections);

    return {
      collection: collection.name,
      total: items.length,
      items: await Promise.all(items.slice(offset, offset + limit).map((item) => itemOf(item, fields, index))),
    };
  },
  describe(_input, { collection, items, total }) {
    return {
      subject: collection,
      summary: items.length === total ? countOf(total, "item") : `${items.length} of ${countOf(total, "item")}`,
    };
  },
});

export const cmsItemsUpsert = defineOperation({
  name: "cms.items.upsert",
  effect: "write",
  idempotent: true,
  permissions: ["Collection.addItems"],
  input: z.strictObject({
    collection: CollectionInput,
    items: z
      .array(
        z.strictObject({
          slug: z.string().min(1).describe("The item's slug: an item with this slug is updated, else created."),
          draft: z.boolean().exactOptional(),
          values: z
            .record(z.string(), z.unknown())
            .default({})
            .describe("Field values by field name; fields left out keep their value."),
        }),
      )
      .min(1)
      .max(CMS_UPSERT_MAX),
  }),
  output: z.object({
    collection: z.string(),
    created: z.array(z.string()),
    updated: z.array(z.string()),
  }),
  async run({ runtime, history }, { collection: query, items }) {
    const { port } = runtime;
    const collections = await port.getCollections();
    const collection = await editableCollection(port, query);
    const [fields, existing] = await Promise.all([collection.getFields(), collection.getItems()]);
    const index = new CmsItemIndex(collections);
    const writes: CmsItemWrite[] = [];

    for (const { slug, draft, values } of items) {
      const fieldData: Record<string, CmsFieldInput> = {};

      for (const [name, value] of Object.entries(values)) {
        const field = findField(fields, name, collection.name);

        fieldData[field.id] = await toFieldInput(field, value, index);
      }

      const current = existing.find((item) => item.slug === slug);

      writes.push({
        ...(current === undefined ? { slug } : { id: current.id }),
        ...(draft === undefined ? {} : { draft }),
        fieldData,
      });
    }

    history?.markIncomplete(CMS_UNDO_NOTE);
    // One call: an entry with an id updates that item, one with a slug adds a new one.
    await collection.addItems(writes);

    const known = new Set(existing.map(({ slug }) => slug));

    return {
      collection: collection.name,
      created: items.filter(({ slug }) => !known.has(slug)).map(({ slug }) => slug),
      updated: items.filter(({ slug }) => known.has(slug)).map(({ slug }) => slug),
    };
  },
  describe(_input, { collection, created, updated }) {
    return {
      subject: collection,
      summary: [
        created.length > 0 ? `${countOf(created.length, "item")} created` : null,
        updated.length > 0 ? `${countOf(updated.length, "item")} updated` : null,
      ]
        .filter((part) => part !== null)
        .join(", "),
    };
  },
});

/** Removes items by slug; their values come back in the result, since undo cannot bring them back yet. */
export const cmsItemsDelete = defineOperation({
  name: "cms.items.delete",
  effect: "destructive",
  idempotent: true,
  permissions: ["Collection.removeItems"],
  input: z.strictObject({
    collection: CollectionInput,
    slugs: z.array(z.string().min(1)).min(1),
  }),
  output: z.object({
    collection: z.string(),
    deleted: z.array(CmsItemSchema),
    /** Slugs no item has. */
    missing: z.array(z.string()),
  }),
  async run({ runtime, history }, { collection: query, slugs }) {
    const { port } = runtime;
    const collections = await port.getCollections();
    const collection = await editableCollection(port, query);
    const [fields, items] = await Promise.all([collection.getFields(), collection.getItems()]);
    const targets = items.filter(({ slug }) => slugs.includes(slug));
    const index = new CmsItemIndex(collections);
    const deleted = await Promise.all(targets.map((item) => itemOf(item, fields, index)));

    if (targets.length > 0) {
      history?.markIncomplete(CMS_UNDO_NOTE);
      await collection.removeItems(targets.map(({ id }) => id));
    }

    return {
      collection: collection.name,
      deleted,
      missing: slugs.filter((slug) => !targets.some((item) => item.slug === slug)),
    };
  },
  describe(_input, { collection, deleted }) {
    return {
      subject: collection,
      summary: `${countOf(deleted.length, "item")} deleted`,
    };
  },
});

export const cmsItemsOrder = defineOperation({
  name: "cms.items.order",
  effect: "write",
  idempotent: true,
  permissions: ["Collection.setItemOrder"],
  input: z.strictObject({
    collection: CollectionInput,
    slugs: z
      .array(z.string().min(1))
      .min(1)
      .describe("Slugs in the order they should come first; the other items keep their order after them."),
  }),
  output: z.object({
    collection: z.string(),
    /** Slugs no item has; they are skipped. */
    missing: z.array(z.string()),
  }),
  async run({ runtime, history }, { collection: query, slugs }) {
    const collection = await editableCollection(runtime.port, query);
    const items = await collection.getItems();
    const first = slugs.flatMap((slug) => items.filter((item) => item.slug === slug).map(({ id }) => id));

    history?.markIncomplete(CMS_UNDO_NOTE);
    await collection.setItemOrder([...first, ...items.map(({ id }) => id).filter((id) => !first.includes(id))]);

    return {
      collection: collection.name,
      missing: slugs.filter((slug) => !items.some((item) => item.slug === slug)),
    };
  },
  describe({ slugs }, { collection }) {
    return {
      subject: collection,
      summary: `${countOf(slugs.length, "item")} moved to the top`,
    };
  },
});
