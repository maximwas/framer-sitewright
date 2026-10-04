import { DSL_ID_PATTERN, DSL_KEY_PATTERN } from "../constants/dsl.ts";
import { OperationError } from "../errors.ts";

/**
 * Quotes a DSL attribute value. Framer's DSL only understands `\"` inside values and keeps other
 * backslashes literal, so only quotes are escaped (verified live, see agent/docs/02-spike-findings.md).
 */
export function dslString(value: string): string {
  if (/[\r\n]/.test(value)) {
    throw new OperationError(
      "INVALID_DSL_VALUE",
      "DSL values cannot contain line breaks.",
      "Put each line into its own text block.",
    );
  }

  if (value.endsWith("\\")) {
    throw new OperationError("INVALID_DSL_VALUE", "DSL values cannot end with a backslash.");
  }

  return `"${value.replaceAll('"', '\\"')}"`;
}

export function dslId(id: string): string {
  if (!DSL_ID_PATTERN.test(id)) {
    throw new OperationError(
      "INVALID_DSL_VALUE",
      `Invalid node id "${id}".`,
      "Use ids returned by Framer, or temp ids made of letters, digits and _.",
    );
  }

  return id;
}

export function dslKey(key: string): string {
  if (!DSL_KEY_PATTERN.test(key)) {
    throw new OperationError("INVALID_DSL_VALUE", `Invalid attribute name "${key}".`);
  }

  return key;
}
