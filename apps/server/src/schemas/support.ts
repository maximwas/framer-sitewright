import * as z from "zod";

/** support.json: when Claude last mentioned how to support the project. */
export const SupportStateSchema = z.object({ lastShownAt: z.string() });
