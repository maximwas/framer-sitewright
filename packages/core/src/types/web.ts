import type * as z from "zod";
import type { RevealResultSchema, WebClientMessageSchema } from "../schemas/web.ts";

export type WebClientMessage = z.infer<typeof WebClientMessageSchema>;

export type RevealResult = z.infer<typeof RevealResultSchema>;
