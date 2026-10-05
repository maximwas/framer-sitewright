import * as z from "zod";
import { CMS_FIELD_TYPES } from "../constants/cms.ts";

export const CmsFieldSpecSchema = z.strictObject({
  name: z.string().min(1),
  type: z.enum(CMS_FIELD_TYPES),
  cases: z.array(z.string().min(1)).min(1).exactOptional().describe("enum: its options, in order."),
  collection: z
    .string()
    .min(1)
    .exactOptional()
    .describe("collectionReference / multiCollectionReference: the collection it points at, by name or id."),
  allowedFileTypes: z
    .array(z.string().min(1))
    .min(1)
    .exactOptional()
    .describe('file: extensions or media types, e.g. ["pdf"] or ["image/*"]; any file when omitted.'),
});

export const CmsFieldSummarySchema = z.object({
  name: z.string(),
  type: z.string(),
  cases: z.array(z.string()).optional(),
  /** The collection a reference field points at, by name. */
  collection: z.string().optional(),
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
  slug: z.string(),
  draft: z.boolean(),
  /** Field values by field name, in the shape cms_items_upsert takes them. */
  values: z.record(z.string(), z.unknown()),
});
