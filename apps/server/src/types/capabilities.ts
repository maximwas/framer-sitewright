import type { OperationRunner } from "./transports.ts";

export interface CapabilityTrackerOptions {
  readonly transports: OperationRunner;
  readonly now?: () => number;
}
