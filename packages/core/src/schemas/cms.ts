import * as z from "zod";
import { CMS_FIELD_TYPES, CMS_LIST_ITEM_FIELD_TYPES } from "../constants/cms.ts";

const AllowedFileTypes = z
  .array(z.string().min(1))
  .min(1)
  .exactOptional()
  .describe('file: extensions or media types, e.g. ["pdf"] or ["image/*"]; any file when omitted.');

/** A field nested in a List: Framer nests no enums, references or Lists. */
export const CmsListItemFieldSpecSchema = z.strictObject({
  name: z.string().min(1),
  type: z.enum(CMS_LIST_ITEM_FIELD_TYPES),
  allowedFileTypes: AllowedFileTypes,
});

export const CmsFieldSpecSchema = z.strictObject({
  name: z.string().min(1),
  type: z.enum(CMS_FIELD_TYPES),
  cases: z.array(z.string().min(1)).min(1).exactOptional().describe("enum: its options, in order."),
  collection: z
    .string()
    .min(1)
    .exactOptional()
    .describe("collectionReference / multiCollectionReference: the collection it points at, by name or id."),
  allowedFileTypes: AllowedFileTypes,
  fields: z
    .array(CmsListItemFieldSpecSchema)
    .min(1)
    .exactOptional()
    .describe(
      'array (a List): the fields of each entry, in order, e.g. [{ "name": "Image", "type": "image" }] for a gallery.',
    ),
});

/** Changes to a field that exists: a rename keeps its values and bindings; enum cases by name. */
export const CmsFieldUpdateSchema = z.strictObject({
  field: z.string().min(1).describe("The field's name or id."),
  name: z.string().min(1).exactOptional().describe("Its new name; items keep their values and layers their binding."),
  addCases: z
    .array(z.string().min(1))
    .min(1)
    .exactOptional()
    .describe("enum: cases to add at the end; one it has already is left alone."),
  renameCases: z
    .record(z.string().min(1), z.string().min(1))
    .exactOptional()
    .describe('enum: new names by current name, e.g. { "Field note": "Field Note" }; items keep the case.'),
  removeCases: z
    .array(z.string().min(1))
    .min(1)
    .exactOptional()
    .describe("enum: cases to remove; items set to one take the first case."),
  caseOrder: z
    .array(z.string().min(1))
    .min(1)
    .exactOptional()
    .describe("enum: case names in the order they should come first; the rest keep their order after them."),
});

const CmsNestedFieldSummarySchema = z.object({
  /** The id a binding takes: var(--variable-<id>). */
  id: z.string(),
  name: z.string(),
  type: z.string(),
});

export const CmsFieldSummarySchema = CmsNestedFieldSummarySchema.extend({
  cases: z.array(z.string()).optional(),
  /** The collection a reference field points at, by name. */
  collection: z.string().optional(),
  /** A List's nested fields. */
  fields: z.array(CmsNestedFieldSummarySchema).optional(),
});

export const CmsCollectionSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  /** Managed by a sync plugin or read-only: the CMS tools only read it. */
  editable: z.boolean(),
  items: z.number().int(),
  fields: z.array(CmsFieldSummarySchema),
});

export const CmsItemSchema = z.object({
  /** What a filter by a reference on the canvas takes. */
  id: z.string(),
  slug: z.string(),
  draft: z.boolean(),
  /** Field values by field name, in the shape cms_items_upsert takes them. */
  values: z.record(z.string(), z.unknown()),
});

/** An item a write touched: its id and the slug Framer keeps. */
export const CmsItemRefSchema = z.object({
  id: z.string(),
  slug: z.string(),
});

/** The layers bound to one field, by page. */
export const CmsFieldBindingSchema = z.object({
  field: z.string(),
  pages: z.array(
    z.object({
      path: z.string(),
      layers: z.array(
        z.object({
          id: z.string(),
          name: z.string().nullable(),
        }),
      ),
      /** Bound layers beyond the ones named. */
      more: z.number().int().exactOptional(),
    }),
  ),
});
