import { INITIAL_BACKOFF_MS, MAX_BACKOFF_MS } from "../constants/connection.ts";

/** The delay before reconnect attempt `attempt` (from 0): exponential, with "equal jitter" (half fixed, half random). */
export function backoffDelay(attempt: number): number {
  const base = Math.min(MAX_BACKOFF_MS, INITIAL_BACKOFF_MS * 2 ** attempt);

  return Math.round(base / 2 + (Math.random() * base) / 2);
}
