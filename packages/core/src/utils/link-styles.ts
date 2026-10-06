import { TOKEN_REFERENCE } from "../constants/history.ts";
import { LINK_UNSTORED_VALUES } from "../constants/link-styles.ts";
import type { DslValue } from "../types/dsl.ts";
import { normalizeColor } from "./color.ts";

/** Radius and padding leaves of a link style state, which Framer stores as four values. */
const BOX_ATTRIBUTE = /\.textBackground(?:Radius|Padding)$/;

/** Color leaves of a link style state (textColor, textDecorationColor, textBackgroundColor). */
const COLOR_ATTRIBUTE = /Color$/;

/** "2px 4px" as Framer stores it: "2px 4px 2px 4px", the CSS shorthand spelled out. */
export function expandBox(value: string): string {
  const [first = "", second = first, third = first, fourth = second] = value.trim().split(/\s+/);

  return [first, second, third, fourth].join(" ");
}

/**
 * Whether a link style attribute already holds the value, as Framer stores it: a value it leaves unset (no underline,
 * auto thickness) is the same as none, boxes are spelled out, and colors compare by what they draw.
 */
export function sameLinkValue(key: string, wanted: DslValue, current: DslValue | undefined): boolean {
  const left = storedForm(key, wanted);
  const right = storedForm(key, current);

  if (left === null || right === null) {
    return left === right;
  }

  if (COLOR_ATTRIBUTE.test(key) && !isTokenReference(left) && !isTokenReference(right)) {
    return sameCssColor(left, right);
  }

  return left === right;
}

/** The token ids a value binds (`var(--token-<id>)`), each once. */
export function tokenIdsIn(value: string): string[] {
  return [...new Set([...value.matchAll(TOKEN_REFERENCE)].map(([, id]) => id ?? ""))].filter((id) => id !== "");
}

/** A value as Framer keeps it: null for one it does not store (LINK_UNSTORED_VALUES), boxes spelled out. */
function storedForm(key: string, value: DslValue | undefined): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const text = BOX_ATTRIBUTE.test(key) ? expandBox(String(value)) : String(value);

  return LINK_UNSTORED_VALUES.get(key.split(".").at(-1) ?? "") === text ? null : text;
}

function isTokenReference(value: string): boolean {
  return tokenIdsIn(value).length > 0;
}

function sameCssColor(left: string, right: string): boolean {
  try {
    return normalizeColor(left) === normalizeColor(right);
  } catch {
    return left === right;
  }
}
