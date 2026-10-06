import * as z from "zod";
import {
  collectionSummary,
  editableCollection,
  fieldCreate,
  findCollection,
  withTitleFirst,
} from "../../cms/collections.ts";
import { CmsItemIndex, itemOf } from "../../cms/values.ts";
import { CMS_UNDO_NOTE } from "../../constants/cms.ts";
import { OperationError } from "../../errors.ts";
import { requireAgent } from "../../framer/runtime.ts";
import { CmsCollectionSummarySchema, CmsFieldSpecSchema, CmsItemSchema } from "../../schemas/cms.ts";
import { countOf } from "../../utils/text.ts";
import { defineOperation } from "../define.ts";

export const cmsCollectionsList = defineOperation({
  name: "cms.collections.list",
  effect: "read",
  idempotent: true,
  permissions: [],
  needsAgent: true,
  input: z.strictObject({
    collection: z.string().min(1).exactOptional().describe("One collection by name or id; omit for all of them."),
  }),
  output: z.object({ collections: z.array(CmsCollectionSummarySchema) }),
  async run({ runtime }, { collection }) {
    const collections = await runtime.port.getCollections();
    const wanted = collection === undefined ? collections : [findCollection(collections, collection)];

    return {
      collections: await Promise.all(wanted.map((entry) => collectionSummary(entry, collections))),
    };
  },
  describe({ collection }, { collections }) {
    return {
      ...(collection === undefined ? {} : { subject: collection }),
      summary: countOf(collections.length, "collection"),
    };
  },
});

export const cmsCollectionCreate = defineOperation({
  name: "cms.collections.create",
  effect: "write",
  idempotent: false,
  permissions: ["createCollection", "Collection.addFields"],
  // In the DSL's own session whenever the project has a key: the DSL did not see fields the plugin made for minutes.
  needsAgent: true,
  input: z.strictObject({
    name: z.string().min(1).describe("Collection name, e.g. Blog."),
    fields: z
      .array(CmsFieldSpecSchema)
      .default([])
      .describe(
        "Fields in order. A string Title comes first unless you pass a string field named Title or Name, which then goes first.",
      ),
  }),
  output: CmsCollectionSummarySchema,
  async run({ runtime, history }, { name, fields }) {
    const { port } = runtime;
    const existing = await port.getCollections();
    const wanted = name.trim().toLowerCase();

    if (existing.some((collection) => collection.name.toLowerCase() === wanted)) {
      throw new OperationError(
        "INVALID_INPUT",
        `A CMS collection named ${name} already exists.`,
        "Add fields to it with cms_fields_set.",
      );
    }

    // Field specs are checked before anything is created: a bad reference must not leave an empty collection.
    const creates = withTitleFirst(fields).map((field) => fieldCreate(field, existing));
    const collection = await port.createCollection(name);

    history?.markIncomplete(CMS_UNDO_NOTE);

    if (creates.length > 0) {
      await collection.addFields(creates);
    }

    return collectionSummary(collection, [...existing, collection]);
  },
  describe({ name }, { fields }) {
    return {
      subject: name,
      summary: `Created with ${countOf(fields.length, "field")}`,
    };
  },
});

/**
 * Deletes a collection with its items. The Plugin API has no call for it: the DSL removes the CollectionNode, so it
 * needs a Server API key. The fields and items come back in the result, enough to build it again.
 */
export const cmsCollectionDelete = defineOperation({
  name: "cms.collections.delete",
  effect: "destructive",
  idempotent: false,
  needsAgent: true,
  permissions: [],
  input: z.strictObject({ collection: z.string().min(1).describe("Collection name or id.") }),
  output: CmsCollectionSummarySchema.extend({ deletedItems: z.array(CmsItemSchema) }),
  async run({ runtime, history }, { collection: query }) {
    const { port } = runtime;
    const collections = await port.getCollections();
    const collection = await editableCollection(port, query);
    const [summary, fields, items] = await Promise.all([
      collectionSummary(collection, collections),
      collection.getFields(),
      collection.getItems(),
    ]);
    const index = new CmsItemIndex(collections);
    const deletedItems = await Promise.all(items.map((item) => itemOf(item, fields, index)));

    history?.markIncomplete(CMS_UNDO_NOTE);
    await requireAgent(runtime).applyChanges(`DEL ${collection.id};`);

    if ((await port.getCollections()).some(({ id }) => id === collection.id)) {
      throw new OperationError("WRITE_FAILED", `Framer did not delete the CMS collection ${collection.name}.`);
    }

    return {
      ...summary,
      deletedItems,
    };
  },
  describe({ collection }, { deletedItems }) {
    return {
      subject: collection,
      summary: `Deleted with ${countOf(deletedItems.length, "item")}`,
    };
  },
});
