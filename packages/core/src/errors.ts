import type { OperationErrorCode } from "./types/errors.ts";

/**
 * A domain error the model can act on. `message` is the reason followed by the hint, so any layer that
 * prints an Error shows both; the bridge carries `reason` and `hint` separately (bridge/protocol.ts).
 */
export class OperationError extends Error {
  readonly code: OperationErrorCode;
  /** The message without the hint. */
  readonly reason: string;
  readonly hint: string | undefined;

  constructor(code: OperationErrorCode, reason: string, hint?: string, options?: ErrorOptions) {
    super(hint === undefined ? reason : `${reason} Hint: ${hint}`, options);
    this.name = "OperationError";
    this.code = code;
    this.reason = reason;
    this.hint = hint;
  }
}
