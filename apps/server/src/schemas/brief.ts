import * as z from "zod";
import { BRIEF_PRIORITIES, BRIEF_QUESTIONS } from "../constants/brief.ts";
import type { BriefQuestionId } from "../types/brief.ts";
import { ProjectRefSchema } from "./transports.ts";

const BriefQuestionIdSchema = z.enum(Object.keys(BRIEF_QUESTIONS) as [BriefQuestionId, ...BriefQuestionId[]]);

const BriefAnswersSchema = z.partialRecord(BriefQuestionIdSchema, z.string().trim().min(1).max(4000));

export const BriefFileSchema = z.object({
  version: z.literal(1),
  project: ProjectRefSchema,
  updatedAt: z.string(),
  answers: BriefAnswersSchema,
});

export const BriefInputSchema = z.strictObject({
  answers: BriefAnswersSchema.exactOptional().describe(
    "The user's answers to save, by question id, merged into the saved brief; a fallback you took counts as an answer. Omit to read the brief and the questions still open.",
  ),
  reset: z.boolean().default(false).describe("Forget the saved brief first, to start over."),
});

const BriefQuestionSchema = z.object({
  id: BriefQuestionIdSchema,
  group: z.string(),
  priority: z.enum(BRIEF_PRIORITIES),
  ask: z.string(),
  why: z.string(),
  options: z.array(z.string()),
  propose: z.string().nullable(),
  fallback: z.string().nullable(),
});

export const BriefOutputSchema = z.object({
  project: ProjectRefSchema.nullable(),
  updatedAt: z.string().nullable(),
  answers: BriefAnswersSchema,
  questions: z.array(BriefQuestionSchema).describe("The questions still open, in asking order."),
  essentialsAnswered: z.boolean(),
  instructions: z.string(),
});
