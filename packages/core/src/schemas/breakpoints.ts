import * as z from "zod";
import { BREAKPOINT_MAX_WIDTH, BREAKPOINT_MIN_WIDTH } from "../constants/nodes.ts";

/** A breakpoint to add to a page: its name and the window width it starts at. */
export const BreakpointSpecSchema = z.strictObject({
  name: z.string().trim().min(1).max(60).describe('Shown on the frame, e.g. "Tablet" or "Phone".'),
  width: z
    .number()
    .int()
    .min(BREAKPOINT_MIN_WIDTH)
    .max(BREAKPOINT_MAX_WIDTH)
    .describe("Window width in px where the breakpoint starts, e.g. 810 for tablets and 390 for phones."),
});

/** One breakpoint of a page, as breakpoints_add reports them. */
export const PageBreakpointSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  width: z.number().nullable(),
  /** The breakpoint the others copy; layers are added and deleted there. */
  primary: z.boolean(),
  /** Added by this call. */
  added: z.boolean(),
});
