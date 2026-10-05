import type * as z from "zod";
import type {
  CmsCollectionSummarySchema,
  CmsFieldSpecSchema,
  CmsFieldSummarySchema,
  CmsItemSchema,
} from "../schemas/cms.ts";

export type CmsFieldSpec = z.infer<typeof CmsFieldSpecSchema>;

export type CmsFieldSummary = z.infer<typeof CmsFieldSummarySchema>;

export type CmsCollectionSummary = z.infer<typeof CmsCollectionSummarySchema>;

export type CmsItem = z.infer<typeof CmsItemSchema>;
