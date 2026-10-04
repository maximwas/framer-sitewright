import { DSL_ATTRIBUTE, DSL_COMMAND_HEAD, DSL_VERBS } from "../constants/dsl.ts";
import type { DslCommand, DslVerb } from "../types/dsl.ts";

/** Parses a DSL string into commands, in order. */
export function parseDsl(dsl: string): DslCommand[] {
  return splitDslCommands(dsl).map(parseDslCommand);
}

/**
 * Splits DSL at `;` outside quotes, like Framer: inside quotes only `\"` is an escape, and `/** … *\/` comments
 * between commands are dropped.
 */
export function splitDslCommands(dsl: string): string[] {
  const commands: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < dsl.length; index++) {
    const char = dsl.charAt(index);

    if (inQuotes && char === "\\" && dsl.charAt(index + 1) === '"') {
      current += '\\"';
      index++;
      continue;
    }

    if (!inQuotes && dsl.startsWith("/*", index)) {
      const end = dsl.indexOf("*/", index + 2);

      index = end === -1 ? dsl.length : end + 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
    }

    if (char === ";" && !inQuotes) {
      pushTrimmed(commands, current);
      current = "";
      continue;
    }

    current += char;
  }

  pushTrimmed(commands, current);

  return commands;
}

/** Parses `+Type id …`, `SET id …`, `DEL id`, `MOVE id …`, `DUPE id …` or `CREATE_VARIANT id …`. */
export function parseDslCommand(raw: string): DslCommand {
  const match = DSL_COMMAND_HEAD.exec(raw);
  const attributes: Record<string, string> = {};
  const rest = (match?.[4] ?? "").replace(DSL_ATTRIBUTE, (_attribute, key: string, value: string) => {
    attributes[key] = value.replaceAll('\\"', '"');

    return "";
  });
  const type = match?.[1] ?? null;
  const verb = match === null || rest.trim() !== "" ? "UNKNOWN" : verbOf(type, match[2]);

  return {
    verb,
    type,
    id: match?.[3] ?? "",
    attributes,
    raw,
  };
}

function verbOf(type: string | null, keyword: string | undefined): DslVerb {
  if (type !== null) {
    return "ADD";
  }

  return DSL_VERBS.find((verb) => verb === keyword) ?? "UNKNOWN";
}

function pushTrimmed(commands: string[], command: string): void {
  const trimmed = command.trim();

  if (trimmed !== "") {
    commands.push(trimmed);
  }
}
