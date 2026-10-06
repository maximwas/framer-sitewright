import * as z from "zod";
import { findFieldBindings } from "../../cms/bindings.ts";
import { collectionSummary, editableCollection, fieldCreate, findField } from "../../cms/collections.ts";
import { applyFieldUpdate, planFieldChanges } from "../../cms/field-changes.ts";
import { CMS_BINDINGS_UNCHECKED, CMS_UNDO_NOTE } from "../../constants/cms.ts";
import { OperationError } from "../../errors.ts";
import {
  CmsCollectionSummarySchema,
  CmsFieldBindingSchema,
  CmsFieldSpecSchema,
  CmsFieldUpdateSchema,
} from "../../schemas/cms.ts";
import type { CmsFieldBinding, CmsFieldBindingSearch } from "../../types/cms.ts";
import { countOf } from "../../utils/text.ts";
import { defineOperation } from "../define.ts";

export const cmsFieldsSet = defineOperation({
  name: "cms.fields.set",
  effect: "destructive",
  idempotent: true,
  permissions: [
    "Collection.addFields",
    "Collection.removeFields",
    "Collection.setFieldOrder",
    "Field.setAttributes",
    "EnumField.addCase",
    "EnumField.setCaseOrder",
    "EnumCase.setAttributes",
    "EnumCase.remove",
  ],
  needsAgent: true,
  input: z.strictObject({
    collection: z.string().min(1).describe("Collection name or id."),
    add: z
      .array(CmsFieldSpecSchema)
      .default([])
      .describe("Fields to add; one that exists with the same name and type is left alone."),
    update: z
      .array(CmsFieldUpdateSchema)
      .default([])
      .describe("Changes to fields that exist: a new name, enum cases added, renamed, removed or ordered."),
    remove: z.array(z.string().min(1)).default([]).describe("Field names to remove, with their values in every item."),
    force: z.boolean().default(false).describe("Remove fields even when layers on the canvas are bound to them."),
    order: z
      .array(z.string().min(1))
      .default([])
      .describe(
        "Field names (after renames) in the order they should come first; the rest keep their order after them.",
      ),
  }),
  output: CmsCollectionSummarySchema.extend({
    added: z.array(z.string()),
    /** Fields renamed or with changed cases, by their name now. */
    updated: z.array(z.string()),
    removed: z.array(z.string()),
    /** Layers that were bound to the removed fields: they show Framer's placeholder now. */
    boundLayers: z.array(CmsFieldBindingSchema).exactOptional(),
    note: z.string().exactOptional(),
  }),
  async run({ runtime, history }, { collection: query, add, update, remove, force, order }) {
    const { port } = runtime;
    const collections = await port.getCollections();
    const collection = await editableCollection(port, query);
    const plan = planFieldChanges(collection.name, await collection.getFields(), {
      add,
      remove,
      update,
    });
    const creates = plan.adding.map((spec) => fieldCreate(spec, collections));
    const search = plan.removing.length === 0 ? null : await findFieldBindings(runtime, collections, plan.removing);

    if (search !== null && search.bindings.length > 0 && !force) {
      throw new OperationError(
        "INVALID_INPUT",
        `Layers are bound to ${boundSummary(search.bindings)}. Removed, the field leaves Framer's placeholder “Content” there.`,
        "Rebind or delete those layers with design_apply first, or pass force: true to remove the field anyway.",
      );
    }

    if (creates.length > 0 || plan.removing.length > 0 || plan.updates.length > 0) {
      history?.markIncomplete(CMS_UNDO_NOTE);
    }

    if (plan.removing.length > 0) {
      await collection.removeFields(plan.removing.map(({ id }) => id));
    }

    for (const fieldUpdate of plan.updates) {
      await applyFieldUpdate(collection, fieldUpdate);
    }

    if (creates.length > 0) {
      await collection.addFields(creates);
    }

    if (order.length > 0) {
      const now = await collection.getFields();
      const first = order.map((name) => findField(now, name, collection.name).id);

      await collection.setFieldOrder([...first, ...now.map(({ id }) => id).filter((id) => !first.includes(id))]);
    }

    const note = plan.removing.length === 0 ? null : bindingNote(search);

    return {
      ...(await collectionSummary(collection, collections)),
      added: plan.adding.map(({ name }) => name),
      updated: plan.updates.map(({ field, name }) => name ?? field.name),
      removed: plan.removing.map(({ name }) => name),
      ...(search === null || search.bindings.length === 0 ? {} : { boundLayers: search.bindings }),
      ...(note === null ? {} : { note }),
    };
  },
  describe({ collection }, { added, updated, removed }) {
    return {
      subject: collection,
      summary:
        [
          added.length > 0 ? `${countOf(added.length, "field")} added` : null,
          updated.length > 0 ? `${countOf(updated.length, "field")} changed` : null,
          removed.length > 0 ? `${countOf(removed.length, "field")} removed` : null,
        ]
          .filter((part) => part !== null)
          .join(", ") || "Fields ordered",
    };
  },
});

/** "Subtitle on /blog/:slug (2 layers) and / (1 layer)", per field. */
function boundSummary(bindings: readonly CmsFieldBinding[]): string {
  return bindings
    .map(
      ({ field, pages }) =>
        `${field} on ${pages
          .map(({ path, layers, more }) => `${path} (${countOf(layers.length + (more ?? 0), "layer")})`)
          .join(", ")}`,
    )
    .join("; ");
}

/** What the call could not see of the canvas before it removed fields; null when it saw all of it. */
function bindingNote(search: CmsFieldBindingSearch | null): string | null {
  if (search === null) {
    return CMS_BINDINGS_UNCHECKED;
  }

  return search.unread.length === 0
    ? null
    : `These pages could not be searched in full for layers bound to the removed fields: ${search.unread.join(", ")}.`;
}
