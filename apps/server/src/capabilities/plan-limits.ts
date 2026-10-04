import { PLAN_LIMIT_PATTERNS } from "../constants/capabilities.ts";

/** Framer's message when an error, or an error it was caused by, says the project's plan lacks the feature. */
export function planLimitMessage(error: unknown): string | null {
  let current: unknown = error;

  // A few levels cover core's WRITE_FAILED wrapping and the bridge; a cycle cannot loop forever.
  for (let depth = 0; depth < 5 && current instanceof Error; depth++) {
    const { message } = current;

    if (PLAN_LIMIT_PATTERNS.some((pattern) => pattern.test(message))) {
      return message;
    }

    current = current.cause;
  }

  return null;
}
