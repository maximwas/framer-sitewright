import type * as z from "zod";
import type { StoredProjectSchema } from "../schemas/keys.ts";

export type StoredProject = z.infer<typeof StoredProjectSchema>;

/** What a caller gives to save a key; the store adds the times. */
export interface ProjectKey {
  readonly id: string;
  readonly name: string;
  readonly url: string;
  readonly key: string;
}
