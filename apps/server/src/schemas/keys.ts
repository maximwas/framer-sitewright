import * as z from "zod";

/** One project's Server API key, as keys.json keeps it. `id` is the hashed id the plugin and the Server API report. */
export const StoredProjectSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  /** The editor link: framer-api connects by it, not by the hashed id. */
  url: z.string().min(1),
  key: z.string().min(1),
  addedAt: z.string(),
  lastUsedAt: z.string().nullable().default(null),
});

export const KeyFileSchema = z.object({
  version: z.literal(1),
  projects: z.record(z.string(), StoredProjectSchema),
});
