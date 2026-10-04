import * as z from "zod";

/** A code file as the code tools list it. */
export const CodeFileSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  path: z.string(),
  exports: z.array(
    z.object({
      name: z.string(),
      type: z.string(),
    }),
  ),
});
