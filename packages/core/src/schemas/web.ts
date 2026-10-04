import * as z from "zod";
import { CallMessageSchema } from "./bridge.ts";

/** What the journal panel sends over its socket: calls, like the plugin window's. */
export const WebClientMessageSchema = CallMessageSchema;

/** `editor.reveal` from a panel: the node to show. */
export const RevealParamsSchema = z.object({ id: z.string().min(1) });

/** How a node was shown: in the open editor through the plugin, and the link that opens it otherwise. */
export const RevealResultSchema = z.object({
  relayed: z.boolean(),
  url: z.string().nullable(),
});
