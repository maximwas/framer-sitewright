import { DSL_ASSET_FAILURE, DSL_PARTIAL_APPLY_HINT } from "../constants/dsl.ts";
import { RawDslResultSchema } from "../schemas/dsl.ts";
import type { DslIssue, DslLintIssue, DslResult } from "../types/dsl.ts";

function toIssues(map: Record<string, unknown[]> | undefined): DslIssue[] {
  return Object.entries(map ?? {}).map(([message, targets]) => ({
    message,
    targets: targets.map((target) => (typeof target === "string" ? target : JSON.stringify(target))),
  }));
}

function toLint(map: Record<string, unknown[]> | undefined, severity: "error" | "warning"): DslLintIssue[] {
  return Object.entries(map ?? {}).map(([message, details]) => ({
    message,
    severity,
    details,
  }));
}

/** Framer may send an empty `parseErrors` ([], {} or ""); only a non-empty one means the DSL did not parse. */
function isEmpty(value: unknown): boolean {
  if (value === undefined || value === null || value === "") {
    return true;
  }

  if (Array.isArray(value)) {
    return value.length === 0;
  }

  return typeof value === "object" && Object.keys(value).length === 0;
}

export function normalizeDslResult(raw: unknown): DslResult {
  const parsed = RawDslResultSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Unexpected applyChanges response.",
      errors: [
        {
          message: `Unexpected response: ${JSON.stringify(raw) ?? String(raw)}`,
          targets: [],
        },
      ],
      warnings: [],
      lint: [],
      renamedIds: {},
    };
  }

  const result = parsed.data;
  const errors = toIssues(result.errors);
  const partial = errors.length > 0 && isEmpty(result.parseErrors);

  if (!isEmpty(result.parseErrors)) {
    errors.push({
      message: `Parse errors: ${JSON.stringify(result.parseErrors)}`,
      targets: [],
    });
  }

  return {
    ok: errors.length === 0,
    message: partial ? `${result.message ?? ""} ${DSL_PARTIAL_APPLY_HINT}`.trim() : (result.message ?? ""),
    errors,
    warnings: toIssues(result.warnings),
    lint: [...toLint(result.linter?.errors, "error"), ...toLint(result.linter?.warnings, "warning")],
    renamedIds: result.renamedIds ?? {},
  };
}

/**
 * applyChanges throws, instead of answering, when it cannot download an image URL of the batch: the answer it would
 * have given, without Framer's internal ids. Null for any other error.
 */
export function assetFailureResult(error: string): DslResult | null {
  const failure = DSL_ASSET_FAILURE.exec(error);

  if (failure === null) {
    return null;
  }

  const [, url = "", reason = ""] = failure;

  return {
    ok: false,
    message: "Nothing was applied: Framer could not download an image of the batch.",
    errors: [
      {
        message: `Framer could not download ${url}${reason === "" ? "" : ` (${reason.trim()})`}. Use an https image URL that answers, or upload the file with image_upload and use the URL it returns.`,
        targets: [url],
      },
    ],
    warnings: [],
    lint: [],
    renamedIds: {},
  };
}
