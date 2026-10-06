import type { QueryCondition } from "../types/node-query.ts";

/** A number in an attribute value ("16px", "0.4"), or null when it holds none. */
function numberIn(value: string): number | null {
  const number = Number.parseFloat(value);

  return Number.isFinite(number) ? number : null;
}

/** Whether a layer's DSL attributes meet one condition; numbers compare as numbers, text in any case. */
export function meetsCondition(
  attributes: Readonly<Record<string, string>>,
  { attribute, op, value }: QueryCondition,
): boolean {
  const actual = attributes[attribute];

  if (op === "exists" || op === "notExists") {
    return (actual !== undefined) === (op === "exists");
  }

  if (actual === undefined || value === undefined) {
    return false;
  }

  const [left, right] = [numberIn(actual), numberIn(value)];

  switch (op) {
    case "equals":
      return left !== null && right !== null ? left === right : actual.toLowerCase() === value.toLowerCase();
    case "contains":
      return actual.toLowerCase().includes(value.toLowerCase());
    case "lessThan":
      return left !== null && right !== null && left < right;
    case "greaterThan":
      return left !== null && right !== null && left > right;
  }
}
