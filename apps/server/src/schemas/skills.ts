import * as z from "zod";

/** The part of a Claude Code PostToolUse hook's input the journal needs; the rest is dropped. */
export const HookInputSchema = z.object({
  session_id: z.string().min(1),
  tool_name: z.string(),
  tool_input: z.record(z.string(), z.unknown()).default({}),
});

/** One line of a session's skill inbox: a skill the AI activated, and the skill's file it read, if any. */
export const SkillNoteSchema = z.object({
  at: z.string(),
  skill: z.string().min(1).max(200),
  reference: z.string().min(1).max(200).nullable(),
});
