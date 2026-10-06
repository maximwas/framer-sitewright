import { BRIEF_INSTRUCTIONS, BRIEF_PRIORITIES, BRIEF_QUESTIONS } from "../constants/brief.ts";
import type { BriefOutput, BriefQuestionId, BriefQuestionInfo, StoredBrief } from "../types/brief.ts";
import type { ProjectRef } from "../types/transports.ts";

/** The saved brief and the questions still open, essentials first. */
export function briefView(project: ProjectRef | null, brief: StoredBrief | null): BriefOutput {
  const answers = brief?.answers ?? {};
  const questions = (Object.entries(BRIEF_QUESTIONS) as [BriefQuestionId, BriefQuestionInfo][])
    .filter(([id]) => answers[id] === undefined)
    .sort(([, a], [, b]) => BRIEF_PRIORITIES.indexOf(a.priority) - BRIEF_PRIORITIES.indexOf(b.priority))
    .map(([id, question]) => ({
      id,
      ...question,
      options: [...question.options],
    }));

  return {
    project,
    updatedAt: brief?.updatedAt ?? null,
    answers,
    questions,
    essentialsAnswered: questions.every((question) => question.priority !== "essential"),
    instructions: BRIEF_INSTRUCTIONS,
  };
}
