import { ActivitySummarySchema, EntryRefSchema } from "@sitewright/core";
import * as z from "zod";

/** The server's answer to `activity.list`. */
export const ActivityListSchema = z.object({
  project: z
    .object({
      id: z.string(),
      name: z.string(),
    })
    .nullable(),
  entries: z.array(ActivitySummarySchema),
  /** For the whole journal, whatever the view lists (servers before the fields: from the entries listed). */
  canUndo: z.boolean().exactOptional(),
  canRedo: z.boolean().exactOptional(),
  /** How many entries the journal holds, reads included. */
  total: z.number().int().exactOptional(),
});

/** The server's answer to `activity.checkpoint`. */
export const CheckpointResultSchema = z.object({ checkpoint: EntryRefSchema.nullable() });

/** The server's answer to `activity.clear`: how many entries were cleared. */
export const ClearResultSchema = z.object({ cleared: z.number().int() });
