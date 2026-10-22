import { DSL_ATTRIBUTE, DSL_CONTROL_PREFIX } from "../constants/dsl.ts";
import { joinCommands } from "./commands.ts";
import { parseDslCommand, splitDslCommands } from "./parse.ts";

/**
 * Each control of an instance in a command of its own. Framer drops every `$control__` of a command when one of them
 * is invalid (an anchor that does not exist yet, a variant name it does not know) and names only that one, so the
 * others were lost without a word. Split, a bad value fails alone and its error says which.
 */
export function separateControls(dsl: string): string {
  const commands = splitDslCommands(dsl);
  let changed = false;
  const separated = commands.flatMap((raw) => {
    const command = parseDslCommand(raw);
    const groups = new Map<string, string[]>();

    // The pairs as written, quotes still escaped: a parsed value has them unescaped and would end at its first quote.
    for (const [pair, key = ""] of raw.matchAll(DSL_ATTRIBUTE)) {
      if (key.startsWith(DSL_CONTROL_PREFIX)) {
        const control = key.slice(DSL_CONTROL_PREFIX.length).split(".")[0] ?? key;

        groups.set(control, [...(groups.get(control) ?? []), pair]);
      }
    }

    if (groups.size < 2 || (command.verb !== "ADD" && command.verb !== "SET")) {
      return [`${raw};`];
    }

    changed = true;

    const pairs = [...groups.values()].flat();
    const rest = pairs.reduce((text, pair) => text.replace(` ${pair}`, ""), raw).trimEnd();
    const kept = command.verb === "SET" && rest === `SET ${command.id}` ? [] : [`${rest};`];

    return [...kept, ...[...groups.values()].map((group) => `SET ${command.id} ${group.join(" ")};`)];
  });

  return changed ? joinCommands(separated) : dsl;
}
