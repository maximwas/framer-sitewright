import { DSL_CONTROL_PREFIX, PLUGIN_RESET_ATTRIBUTES } from "../constants/dsl.ts";
import type { PluginWrite } from "../types/dsl.ts";
import { isPerSideShorthand } from "../utils/border.ts";
import { joinCommands } from "./commands.ts";
import { parseDslCommand, splitDslCommands } from "./parse.ts";

/**
 * The batch without the writes the DSL refuses and the plugin makes, and those writes: a border control per side (the
 * DSL takes one width, "1px solid <color>") and zIndex="null" (the DSL takes only a number; seen 12.10.2026). The
 * plugin makes them after the batch, so a node the batch creates has its id. A SET left with nothing to set goes.
 */
export function splitPluginWrites(dsl: string): { dsl: string; writes: PluginWrite[] } {
  const writes: PluginWrite[] = [];
  const commands = splitDslCommands(dsl).flatMap((raw) => {
    const command = parseDslCommand(raw);
    const taken = Object.entries(command.attributes).flatMap(([key, value]): [string, PluginWrite][] => {
      if (key.startsWith(DSL_CONTROL_PREFIX) && isPerSideShorthand(value)) {
        return [
          [
            `${key}="${value}"`,
            {
              kind: "control",
              nodeId: command.id,
              control: key.slice(DSL_CONTROL_PREFIX.length),
              value,
            },
          ],
        ];
      }

      return PLUGIN_RESET_ATTRIBUTES.has(key) && value === "null"
        ? [
            [
              `${key}="${value}"`,
              {
                kind: "reset",
                nodeId: command.id,
                attribute: key,
              },
            ],
          ]
        : [];
    });

    if ((command.verb !== "SET" && command.verb !== "ADD") || taken.length === 0) {
      return [`${raw};`];
    }

    const text = taken.reduce((rest, [pair]) => rest.replace(` ${pair}`, ""), raw);

    writes.push(...taken.map(([, write]) => write));

    return command.verb === "SET" && Object.keys(parseDslCommand(text).attributes).length === 0 ? [] : [`${text};`];
  });

  return {
    dsl: writes.length === 0 ? dsl : joinCommands(commands),
    writes,
  };
}
