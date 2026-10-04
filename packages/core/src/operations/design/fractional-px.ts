import { FRACTIONAL_PX } from "../../constants/dsl.ts";
import type { DslCommand, DslIssue } from "../../types/dsl.ts";

/**
 * Attributes a batch wrote with fractional px, e.g. a size copied from a design as 569.15px. Framer takes them, but the
 * editor's panel then shows decimals: the batch comes back with a warning to write whole numbers.
 */
export function fractionalPxWarnings(
  commands: readonly DslCommand[],
  renamedIds: Readonly<Record<string, string>>,
): DslIssue[] {
  return commands.flatMap((command) =>
    command.verb === "ADD" || command.verb === "SET"
      ? Object.entries(command.attributes).flatMap(([key, value]) =>
          FRACTIONAL_PX.test(value)
            ? [
                {
                  message: `${key}="${value}" has a fractional px value: write whole numbers, e.g. 569px rather than 569.15px.`,
                  targets: [renamedIds[command.id] ?? command.id],
                },
              ]
            : [],
        )
      : [],
  );
}
