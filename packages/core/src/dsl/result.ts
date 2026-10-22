import { DSL_ASSET_FAILURE, DSL_PARTIAL_APPLY_HINT, LOW_CONFIDENCE_LINT, TOO_CLOSE_LINT } from "../constants/dsl.ts";
import { RawDslResultSchema } from "../schemas/dsl.ts";
import type { DslIssue, DslLintIssue, DslResult } from "../types/dsl.ts";
import { isPlainObject } from "../utils/guards.ts";

function toIssues(map: Record<string, unknown[]> | undefined): DslIssue[] {
  return Object.entries(map ?? {}).map(([message, targets]) => ({
    message,
    targets: targets.map((target) => (typeof target === "string" ? target : JSON.stringify(target))),
  }));
}

function toLint(map: Record<string, unknown[]> | undefined, severity: "error" | "warning"): DslLintIssue[] {
  return Object.entries(map ?? {}).flatMap(([message, found]) => {
    const known = LOW_CONFIDENCE_LINT.find(({ pattern }) => pattern.test(message));
    // Two layers at a negative spacing are no neighbours: one was hidden or moved away (seen: -1852.7).
    const details = TOO_CLOSE_LINT.test(message) ? found.filter((detail) => !negativeSpacing(detail)) : found;

    if (details.length === 0) {
      return [];
    }

    return {
      message,
      severity,
      details,
      ...(known === undefined
        ? {}
        : {
            confidence: "low" as const,
            note: known.note,
          }),
    };
  });
}

function negativeSpacing(detail: unknown): boolean {
  return isPlainObject(detail) && typeof detail.spacing === "number" && detail.spacing < 0;
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
 * applyChanges throws, instead of answering, when it cannot download an image URL of the batch, after applying all of
 * the batch but that image (seen live 06.10.2026, for SET and `+` commands alike): a refusal that says so, without
 * Framer's internal ids. Null for any other error.
 */
export function assetFailureResult(error: string): DslResult | null {
  const failure = DSL_ASSET_FAILURE.exec(error);

  if (failure === null) {
    return null;
  }

  const [, url = "", reason = ""] = failure;

  return {
    ok: false,
    message:
      "Framer could not download an image of the batch: it applied the rest of the batch without that image, and did not report the ids of new nodes. Read what changed with nodes_read before sending anything again.",
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
