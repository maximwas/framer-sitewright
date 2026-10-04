import { CENTERING_AXES, DSL_PIN_PLACEHOLDER } from "../constants/dsl.ts";
import type { DslCommand } from "../types/dsl.ts";
import { joinCommands } from "./commands.ts";
import { parseDslCommand, splitDslCommands } from "./parse.ts";

/**
 * Framer refuses to create an absolute layer without one horizontal and one vertical pin ("Absolute positioning
 * requires one explicit horizontal pin"), yet a centred layer has neither: `left` and `right` are null and
 * `centerAnchorX` places it. Set on a layer that exists, that works (seen 01.10.2026). So a create that asks for
 * centring on an axis (its center anchor, no pins) gets a temporary pin, and a SET right after drops it.
 */
export function deferAbsoluteCentering(dsl: string): string {
  const commands = splitDslCommands(dsl);
  const parsed = commands.map(parseDslCommand);

  if (!parsed.some((command) => centeredAxes(command).length > 0)) {
    return dsl;
  }

  return joinCommands(
    parsed.flatMap((command, index) => {
      const raw = commands[index] ?? command.raw;
      const axes = centeredAxes(command);

      if (axes.length === 0) {
        return [`${raw};`];
      }

      const pinned = axes.reduce(
        (text, axis) =>
          `${axis.pins.reduce((without, pin) => without.replace(new RegExp(`\\s+${pin}="null"`), ""), text)} ${axis.pins[0]}="${DSL_PIN_PLACEHOLDER}"`,
        raw,
      );
      const released = axes.map((axis) => `${axis.pins[0]}="null"`).join(" ");

      return [`${pinned};`, `SET ${command.id} ${released};`];
    }),
  );
}

/** The axes an ADD of an absolute layer centres on: a center anchor given, and no pin with a value. */
function centeredAxes(command: DslCommand): (typeof CENTERING_AXES)[number][] {
  const { attributes } = command;

  if (command.verb !== "ADD" || attributes.position !== "absolute") {
    return [];
  }

  const pinned = (pin: string) => attributes[pin] !== undefined && attributes[pin] !== "null";

  return CENTERING_AXES.filter((axis) => attributes[axis.anchor] !== undefined && !axis.pins.some(pinned));
}
