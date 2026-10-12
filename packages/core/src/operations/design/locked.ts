import { DSL_LOCK_ATTRIBUTE } from "../../constants/dsl.ts";
import type { DslCommand, DslIssue } from "../../types/dsl.ts";

/**
 * Layers a batch tried to lock or unlock. Framer takes `locked` in the DSL and ignores it, answering "Commands applied
 * cleanly" (seen 12.10.2026): the batch says so and names nodes_lock, which goes through the Plugin API.
 */
export function lockedWarnings(
  commands: readonly DslCommand[],
  renamedIds: Readonly<Record<string, string>>,
): DslIssue[] {
  const targets = commands
    .filter((command) => (command.verb === "ADD" || command.verb === "SET") && DSL_LOCK_ATTRIBUTE in command.attributes)
    .map((command) => renamedIds[command.id] ?? command.id);

  return targets.length === 0
    ? []
    : [
        {
          message: `Framer ignores ${DSL_LOCK_ATTRIBUTE} in design_apply: nothing was locked or unlocked. Use nodes_lock for these layers.`,
          targets,
        },
      ];
}
