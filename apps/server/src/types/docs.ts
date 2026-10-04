import type { Logger } from "./logging.ts";

export interface DocsCacheOptions {
  readonly cacheDir: string;
  readonly apiVersion: string;
  readonly maxAgeMs?: number;
  readonly now?: () => number;
  readonly logger?: Logger;
}

export interface CachedText {
  readonly text: string;
  readonly fresh: boolean;
}
