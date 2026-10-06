import * as z from "zod";
import { TEMPLATE_SECTIONS } from "../constants/template-audit.ts";
import { SiteFindingSchema } from "./site-checks.ts";

/** One section of Framer's template checklist: what it checks and what the audit found there. */
export const TemplateSectionSchema = z.object({
  section: z.enum(TEMPLATE_SECTIONS),
  checks: z.string(),
  findings: z.array(SiteFindingSchema),
});
