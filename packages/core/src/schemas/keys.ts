import * as z from "zod";

/** What the journal page knows about the Server API key of the project it shows; never the key itself. */
export const ProjectKeyStatusSchema = z.object({
  project: z
    .object({
      id: z.string(),
      name: z.string(),
    })
    .nullable(),
  saved: z
    .object({
      keyHint: z.string(),
      url: z.string(),
    })
    .nullable(),
  /** The link the plugin reported; without it, saving a key needs the link pasted. */
  editorUrl: z.string().nullable(),
});

/** keys.set from the journal page: the key, and the project link when the plugin could not give it. */
export const KeySetParamsSchema = z.object({
  key: z.string().trim().min(1).max(500),
  url: z.string().trim().max(500).optional(),
});
