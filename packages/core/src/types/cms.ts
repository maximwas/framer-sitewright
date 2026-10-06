import type * as z from "zod";
import type { CMS_LIST_ITEM_FIELD_TYPES } from "../constants/cms.ts";
import type {
  CmsCollectionSummarySchema,
  CmsFieldBindingSchema,
  CmsFieldSpecSchema,
  CmsFieldSummarySchema,
  CmsFieldUpdateSchema,
  CmsItemRefSchema,
  CmsItemSchema,
  CmsListItemFieldSpecSchema,
} from "../schemas/cms.ts";

export type CmsFieldSpec = z.infer<typeof CmsFieldSpecSchema>;

export type CmsListItemFieldSpec = z.infer<typeof CmsListItemFieldSpecSchema>;

export type CmsListItemFieldType = (typeof CMS_LIST_ITEM_FIELD_TYPES)[number];

export type CmsFieldUpdate = z.infer<typeof CmsFieldUpdateSchema>;

export type CmsFieldSummary = z.infer<typeof CmsFieldSummarySchema>;

export type CmsCollectionSummary = z.infer<typeof CmsCollectionSummarySchema>;

export type CmsItem = z.infer<typeof CmsItemSchema>;

export type CmsItemRef = z.infer<typeof CmsItemRefSchema>;

export type CmsFieldBinding = z.infer<typeof CmsFieldBindingSchema>;

/** Layers bound to fields across the site, and the pages the search could not read in full. */
export interface CmsFieldBindingSearch {
  readonly bindings: CmsFieldBinding[];
  readonly unread: string[];
}
