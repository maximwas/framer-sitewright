import { OperationError } from "../errors.ts";
import type { DslAttributes, DslValue } from "../types/dsl.ts";
import { dslId, dslKey, dslString } from "./escape.ts";

function formatAttributes(attributes: DslAttributes): string {
  return Object.entries(attributes)
    .flatMap(([key, value]) => (value === undefined ? [] : [`${dslKey(key)}=${dslString(formatValue(value))}`]))
    .join(" ");
}

/** The DSL writes every value as a quoted string; null clears an attribute. */
function formatValue(value: DslValue): string {
  return value === null ? "null" : String(value);
}

export function addNode(type: string, id: string, attributes: DslAttributes = {}): string {
  const tail = formatAttributes(attributes);
  const head = `+${dslKey(type)} ${dslId(id)}`;

  return tail === "" ? `${head};` : `${head} ${tail};`;
}

export function setNode(id: string, attributes: DslAttributes): string {
  const tail = formatAttributes(attributes);

  if (tail === "") {
    throw new OperationError("INVALID_DSL_VALUE", `SET ${id} needs at least one attribute.`);
  }

  return `SET ${dslId(id)} ${tail};`;
}

export function deleteNode(id: string): string {
  return `DEL ${dslId(id)};`;
}

export function joinCommands(commands: readonly string[]): string {
  return commands.join("\n");
}

export function tokenRef(tokenId: string): string {
  return `var(--token-${tokenId})`;
}

/**
 * `key="value"` pairs for a snapshot's attributes. Unlike SET or `+Type` built from known input, a snapshot may hold
 * something the DSL cannot write (a line break, an odd key): such entries are skipped and named, not thrown.
 */
export function formatDslAttributes(attributes: DslAttributes): { text: string; skipped: string[] } {
  const parts: string[] = [];
  const skipped: string[] = [];

  for (const [key, value] of Object.entries(attributes)) {
    if (value === undefined) {
      continue;
    }

    try {
      parts.push(`${dslKey(key)}=${dslString(formatValue(value))}`);
    } catch {
      skipped.push(key);
    }
  }

  return {
    text: parts.join(" "),
    skipped,
  };
}
