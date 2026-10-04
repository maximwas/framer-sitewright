import type { OPERATION_ERROR_CODES } from "../constants/errors.ts";

export type OperationErrorCode = (typeof OPERATION_ERROR_CODES)[number];
