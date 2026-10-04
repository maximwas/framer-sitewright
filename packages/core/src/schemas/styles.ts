import * as z from "zod";
import { DslResultSchema } from "./dsl.ts";
import { ViaUsedSchema } from "./operations.ts";

export const StyleRefSchema = z.object({
  path: z.string(),
  id: z.string(),
});

/** A style the batch creates; `id` is null on a dry run and when Framer does not report it. */
export const CreatedStyleSchema = z.object({
  path: z.string(),
  id: z.string().nullable(),
});

/** Output of both upserts: the plan (updated, unchanged) plus what the writer did. */
export const StyleUpsertOutputSchema = z.object({
  created: z.array(CreatedStyleSchema),
  updated: z.array(StyleRefSchema),
  unchanged: z.array(StyleRefSchema),
  dryRun: z.boolean(),
  via: ViaUsedSchema,
  dsl: z.string(),
  diagnostics: DslResultSchema.nullable(),
});

/** Output of both deletes. */
export const StyleDeleteOutputSchema = z.object({
  deleted: z.array(StyleRefSchema),
  /** Styles Framer refused to delete, e.g. because text still uses them; they are still in the project. */
  failed: z.array(
    StyleRefSchema.extend({
      reason: z.string(),
    }),
  ),
  notFound: z.array(z.string()),
  via: ViaUsedSchema,
  diagnostics: DslResultSchema.nullable(),
});
