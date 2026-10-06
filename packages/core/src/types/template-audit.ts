import type * as z from "zod";
import type { TEMPLATE_SECTIONS } from "../constants/template-audit.ts";
import type { TemplateSectionSchema } from "../schemas/template-audit.ts";

export type TemplateSectionId = (typeof TEMPLATE_SECTIONS)[number];

export type TemplateSection = z.infer<typeof TemplateSectionSchema>;
