import { DSL_INITIAL_VALUE } from "../constants/dsl.ts";
import { joinCommands } from "./commands.ts";
import { parseDslCommand, splitDslCommands } from "./parse.ts";

/**
 * Framer refuses `+IconVariable … initialValue="Shopping Bag"` ("could not be prepared as a variable from set") but
 * takes the same icon in a SET once the variable exists (seen 01.10.2026). The value moves to a SET right after the
 * command; DSL without such a command comes back unchanged.
 */
export function deferIconInitialValues(dsl: string): string {
  const commands = splitDslCommands(dsl);

  if (!commands.some((raw) => isIconVariableWithValue(raw))) {
    return dsl;
  }

  return joinCommands(
    commands.flatMap((raw) => {
      const value = isIconVariableWithValue(raw) ? DSL_INITIAL_VALUE.exec(raw) : null;

      if (value === null) {
        return [`${raw};`];
      }

      return [`${raw.replace(value[0], "")};`, `SET ${parseDslCommand(raw).id} initialValue=${value[1]};`];
    }),
  );
}

function isIconVariableWithValue(raw: string): boolean {
  const command = parseDslCommand(raw);

  return command.verb === "ADD" && command.type === "IconVariable" && DSL_INITIAL_VALUE.test(raw);
}
