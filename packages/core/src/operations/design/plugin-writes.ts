import type { DslIssue, PluginWrite } from "../../types/dsl.ts";
import type { OperationContext } from "../../types/operations.ts";
import { errorMessage } from "../../utils/errors.ts";
import { componentControlsSet } from "../components/controls-set.ts";

/**
 * Makes the writes of a batch the DSL refuses, through the plugin, after the batch: a border control per side as
 * component_controls_set does, a reset with setAttributes. Refusals come back as the batch's errors, controls Framer
 * did not keep as its warnings. Neither is in the batch's undo step.
 */
export async function writeThroughPlugin(
  context: OperationContext,
  writes: readonly PluginWrite[],
  renamedIds: Readonly<Record<string, string>>,
): Promise<{ errors: DslIssue[]; warnings: DslIssue[] }> {
  const errors: DslIssue[] = [];
  const warnings: DslIssue[] = [];

  for (const write of writes) {
    const id = renamedIds[write.nodeId] ?? write.nodeId;
    const what = write.kind === "control" ? `$control__${write.control}="${write.value}"` : `${write.attribute}="null"`;

    try {
      if (write.kind === "control") {
        const written = await componentControlsSet.run(context, {
          nodeId: id,
          controls: { [write.control]: write.value },
        });

        if (written.notStored.length > 0) {
          warnings.push({
            message: `Framer did not keep ${what}: check it with node_screenshot.`,
            targets: [id],
          });
        }
      } else {
        await context.runtime.port.setAttributes(id, { [write.attribute]: null });
        context.history?.markIncomplete(`${what} was reset through the plugin: undo does not restore it.`);
      }
    } catch (error) {
      errors.push({
        message: `${what} was not written: ${errorMessage(error)}`,
        targets: [id],
      });
    }
  }

  return {
    errors,
    warnings,
  };
}
