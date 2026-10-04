/** WebSocket close code for a deliberate close. */
export const NORMAL_CLOSURE = 1000;

/** Reconnect backoff: the first delay, doubled per failed attempt up to the maximum. */
export const INITIAL_BACKOFF_MS = 500;
export const MAX_BACKOFF_MS = 10_000;

/** How long a panel waits for the server to answer a call. */
export const CALL_TIMEOUT_MS = 30_000;
