import type * as z from "zod";
import type { FoundLayerSchema, RedirectSchema, TextChangeSchema } from "../schemas/site.ts";

export type FoundLayer = z.infer<typeof FoundLayerSchema>;

export type TextChange = z.infer<typeof TextChangeSchema>;

export type RedirectSummary = z.infer<typeof RedirectSchema>;
