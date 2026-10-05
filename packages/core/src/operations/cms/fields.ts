import * as z from "zod";
import { collectionSummary, editableCollection, fieldCreate, findField } from "../../cms/collections.ts";
import { CMS_UNDO_NOTE } from "../../constants/cms.ts";
import { OperationError } from "../../errors.ts";
import { CmsCollectionSummarySchema, CmsFieldSpecSchema } from "../../schemas/cms.ts";
import { countOf } from "../../utils/text.ts";
import { defineOperation } from "../define.ts";

export const cmsFieldsSet = defineOperation({
  name: "cms.fields.set",
  effect: "destructive",
  idempotent: true,
  permissions: ["Collection.addFields", "Collection.removeFields", "Collection.setFieldOrder"],
  input: z.strictObject({
    collection: z.string().min(1).describe("Collection name or id."),
    add: z
      .array(CmsFieldSpecSchema)
      .default([])
      .describe("Fields to add; one that exists with the same name and type is left alone."),
    remove: z.array(z.string().min(1)).default([]).describe("Field names to remove, with their values in every item."),
    order: z
      .array(z.string().min(1))
      .default([])
      .describe("Field names in the order they should come first; the rest keep their order after them."),
  }),
  output: CmsCollectionSummarySchema.extend({
    added: z.array(z.string()),
    removed: z.array(z.string()),
  }),
  async run({ runtime, history }, { collection: query, add, remove, order }) {
    const { port } = runtime;
    const collections = await port.getCollections();
    const collection = await editableCollection(port, query);
    const fields = await collection.getFields();
    const removing = remove.map((name) => findField(fields, name, collection.name));
    const adding = add.filter((spec) => {
      const same = fields.find((field) => field.name.toLowerCase() === spec.name.trim().toLowerCase());

      if (same !== undefined && same.type !== spec.type) {
        throw new OperationError(
          "INVALID_INPUT",
          `${collection.name} already has a ${same.type} field named ${same.name}.`,
          "Remove it first, or pick another name.",
        );
      }

      return same === undefined;
    });
    const creates = adding.map((spec) => fieldCreate(spec, collections));

    if (creates.length > 0 || removing.length > 0) {
      history?.markIncomplete(CMS_UNDO_NOTE);
    }

    if (removing.length > 0) {
      await collection.removeFields(removing.map(({ id }) => id));
    }

    if (creates.length > 0) {
      await collection.addFields(creates);
    }

    if (order.length > 0) {
      const now = await collection.getFields();
      const first = order.map((name) => findField(now, name, collection.name).id);

      await collection.setFieldOrder([...first, ...now.map(({ id }) => id).filter((id) => !first.includes(id))]);
    }

    return {
      ...(await collectionSummary(collection, collections)),
      added: adding.map(({ name }) => name),
      removed: removing.map(({ name }) => name),
    };
  },
  describe({ collection }, { added, removed }) {
    return {
      subject: collection,
      summary:
        [
          added.length > 0 ? `${countOf(added.length, "field")} added` : null,
          removed.length > 0 ? `${countOf(removed.length, "field")} removed` : null,
        ]
          .filter((part) => part !== null)
          .join(", ") || "Fields ordered",
    };
  },
});
