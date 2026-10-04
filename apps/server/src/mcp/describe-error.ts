import { FramerAPIError } from "framer-api";
import { planLimitMessage } from "../capabilities/plan-limits.ts";
import { ERROR_HINTS, PLAN_LIMIT_HINT } from "../constants/mcp.ts";

/** The text a tool error shows the model: what went wrong and, when known, what to do next. */
export function describeError(error: unknown): string {
  const text = errorText(error);

  return planLimitMessage(error) === null ? text : `${text} ${PLAN_LIMIT_HINT}`;
}

function errorText(error: unknown): string {
  if (error instanceof FramerAPIError) {
    const hint = ERROR_HINTS[error.code];

    return `Framer API error ${error.code}: ${error.message}${hint === undefined ? "" : ` Hint: ${hint}`}`;
  }

  return error instanceof Error ? error.message : String(error);
}
