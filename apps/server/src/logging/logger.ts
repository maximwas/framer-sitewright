import pino from "pino";
import type { LogLevel } from "../types/logging.ts";
import { prepareLogFile } from "./log-file.ts";

/**
 * stdout belongs to MCP JSON-RPC, so logs go to stderr (fd 2), where Claude Code keeps them per session. With a
 * `file`, they also go to the log every sitewright process on this machine shares (`pnpm logs`); each line has its pid.
 */
export function createLogger(level: LogLevel, file: string | null = null) {
  const options = {
    name: "sitewright",
    level,
    redact: {
      paths: ["apiKey", "*.apiKey", "token", "*.token", "headers"],
      censor: "[redacted]",
    },
  };
  const stderr = pino.destination({
    dest: 2,
    sync: true,
  });

  if (file === null || !prepareLogFile(file)) {
    return pino(options, stderr);
  }

  const shared = pino.destination({
    dest: file,
    sync: true,
    mode: 0o600,
  });

  return pino(options, pino.multistream([{ stream: stderr }, { stream: shared }]));
}
