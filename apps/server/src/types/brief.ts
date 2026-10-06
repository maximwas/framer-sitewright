import type * as z from "zod";
import type { BRIEF_PRIORITIES, BRIEF_QUESTIONS } from "../constants/brief.ts";
import type { BriefFileSchema, BriefOutputSchema } from "../schemas/brief.ts";

type BriefPriority = (typeof BRIEF_PRIORITIES)[number];

/** One question of the brief (see BRIEF_QUESTIONS). */
export interface BriefQuestionInfo {
  readonly group: "project" | "look" | "content" | "behaviour" | "launch";
  readonly priority: BriefPriority;
  readonly ask: string;
  /** What the answer decides in the build. */
  readonly why: string;
  readonly options: readonly string[];
  /** What to propose for this project instead of asking an open question. */
  readonly propose: string | null;
  /** What to take when the user skips the question; null: it must be answered. */
  readonly fallback: string | null;
}

export type BriefQuestionId = keyof typeof BRIEF_QUESTIONS;

export type BriefAnswers = Partial<Record<BriefQuestionId, string>>;

/** A project's brief as briefs/<project>.json keeps it. */
export type StoredBrief = z.infer<typeof BriefFileSchema>;

export type BriefOutput = z.input<typeof BriefOutputSchema>;
