import type * as z from "zod";
import type { KeySetParamsSchema, ProjectKeyStatusSchema } from "../schemas/keys.ts";

export type ProjectKeyStatus = z.infer<typeof ProjectKeyStatusSchema>;

export type KeySetParams = z.infer<typeof KeySetParamsSchema>;
