/** Every OperationError code; tools and the plugin bridge pass them on unchanged. */
export const OPERATION_ERROR_CODES = [
  "INVALID_INPUT",
  "INVALID_COLOR",
  "INVALID_DSL_VALUE",
  "INVALID_PATH",
  "DUPLICATE_PATH",
  "NOT_FOUND",
  "FONT_NOT_FOUND",
  "TOKEN_NOT_FOUND",
  "NOT_CONFIGURED",
  "UNSUPPORTED_TRANSPORT",
  "RESULT_TOO_LARGE",
  "PERMISSION_DENIED",
  "WRITE_FAILED",
] as const;
