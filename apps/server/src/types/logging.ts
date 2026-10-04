import type { LOG_LEVELS } from "../constants/logging.ts";
import type { createLogger } from "../logging/logger.ts";

export type LogLevel = (typeof LOG_LEVELS)[number];

export type Logger = ReturnType<typeof createLogger>;
