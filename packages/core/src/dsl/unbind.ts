import { DSL_ATTRIBUTE } from "../constants/dsl.ts";
import { joinCommands } from "./commands.ts";
import { parseDslCommand, splitDslCommands } from "./parse.ts";

/**
 * A value set in the command that unbinds it goes in a SET of its own after it: Framer drops the binding and keeps the
 * value the binding last showed, without a word (`text.from="null" text="9 DAYS"` left "9", seen 22.10.2026).
 */
export function deferUnboundValues(dsl: string): string {
  const commands = splitDslCommands(dsl);
  let changed = false;
  const deferred = commands.flatMap((raw) => {
    const command = parseDslCommand(raw);
    const values =
      command.verb === "SET"
        ? [...raw.matchAll(DSL_ATTRIBUTE)].filter(([, key = ""]) => command.attributes[`${key}.from`] === "null")
        : [];

    if (values.length === 0) {
      return [`${raw};`];
    }

    changed = true;

    const rest = values.reduce((text, [pair]) => text.replace(` ${pair}`, ""), raw).trimEnd();

    return [`${rest};`, `SET ${command.id} ${values.map(([pair]) => pair).join(" ")};`];
  });

  return changed ? joinCommands(deferred) : dsl;
}
