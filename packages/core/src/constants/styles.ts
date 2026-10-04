import type { WriteAction } from "../types/styles.ts";

/** How an applied write is reported, e.g. "created Brand/Primary". */
export const WRITE_ACTION_PAST_TENSE: Record<WriteAction, string> = {
  create: "created",
  update: "updated",
  delete: "deleted",
};
