import type * as z from "zod";
import type { HookInputSchema, SkillNoteSchema } from "../schemas/skills.ts";

export type HookInput = z.input<typeof HookInputSchema>;

export type SkillNote = z.infer<typeof SkillNoteSchema>;
