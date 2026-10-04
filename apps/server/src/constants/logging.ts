/** pino's levels, most severe first, plus silent. */
export const LOG_LEVELS = ["fatal", "error", "warn", "info", "debug", "trace", "silent"] as const;

/** pino's numeric levels by name, as `pnpm logs` prints them. */
export const LOG_LEVEL_NAMES: Readonly<Record<number, string>> = {
  10: "trace",
  20: "debug",
  30: "info",
  40: "warn",
  50: "error",
  60: "fatal",
};

/** ANSI colours of the levels that need attention in `pnpm logs`. */
export const LOG_LEVEL_COLORS: Readonly<Record<string, string>> = {
  warn: "\u001b[33m",
  error: "\u001b[31m",
  fatal: "\u001b[31m",
};

export const ANSI_RESET = "\u001b[0m";

/** The shared log file is set aside (as .1) once it grows past this, when a process starts. */
export const LOG_FILE_MAX_BYTES = 5 * 1024 * 1024;

/** How many lines `pnpm logs` shows from before it started. */
export const LOG_TAIL_LINES = 40;
