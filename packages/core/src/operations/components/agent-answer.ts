import { OperationError } from "../../errors.ts";
import { ComponentAgentAnswerSchema } from "../../schemas/components.ts";
import type { ComponentAgentAnswer } from "../../types/components.ts";
import { inSitewrightTerms } from "../../utils/components.ts";

/** Framer's answer to a component agent call; one in another form fails rather than passing for a success. */
export function readAgentAnswer(raw: unknown, action: string): ComponentAgentAnswer {
  const parsed = ComponentAgentAnswerSchema.safeParse(raw);

  if (!parsed.success) {
    throw new OperationError(
      "WRITE_FAILED",
      `Framer answered ${action} in a form Sitewright does not know: ${JSON.stringify(raw)}.`,
      "Read the layer with nodes_read to see whether it changed.",
    );
  }

  return parsed.data;
}

/** Why Framer refused (blocked, or a status Sitewright does not know), in Sitewright's tool names. */
export function refusal(answer: ComponentAgentAnswer, failed: string, hint: string): OperationError {
  return new OperationError(
    "WRITE_FAILED",
    `${failed}: ${inSitewrightTerms(answer.message ?? `status ${answer.status}`)}`,
    hint,
  );
}
