import { DSL_CONTROL_PREFIX, DSL_VAR_REFERENCE } from "../../constants/dsl.ts";
import { readNodes } from "../../history/dsl/read-nodes.ts";
import { ComponentControlsSchema, ControlsByIdSchema, IconSetCatalogSchema } from "../../schemas/assets.ts";
import type { DslCommand, DslIssue } from "../../types/dsl.ts";
import type { AgentPort } from "../../types/framer.ts";

/**
 * Framer ignores an icon from the project's own vector set written to a component instance's icon control: the batch
 * reports success, the instance keeps the component's default icon, and serialize() never shows the value (seen
 * 01.10.2026; a Lucide icon on the same kind of control works, spike on the sandbox). Such writes come back as
 * warnings, so the caller can tell the user instead of believing the change landed.
 */
export async function projectIconControlWarnings(
  agent: AgentPort,
  pagePath: string,
  commands: readonly DslCommand[],
  renamedIds: Readonly<Record<string, string>>,
): Promise<DslIssue[]> {
  const writes = commands.flatMap((command) => {
    const keys = Object.entries(command.attributes).flatMap(([key, value]) =>
      key.startsWith(DSL_CONTROL_PREFIX) && !DSL_VAR_REFERENCE.test(value) ? [key] : [],
    );
    const isInstanceWrite =
      (command.verb === "ADD" && command.type === "ComponentInstanceNode") || command.verb === "SET";

    return isInstanceWrite && keys.length > 0
      ? [
          {
            command,
            keys,
          },
        ]
      : [];
  });

  if (writes.length === 0) {
    return [];
  }

  const instances = await readNodes(
    agent,
    pagePath,
    writes.flatMap(({ command }) => (command.verb === "SET" ? [command.id] : [])),
    0,
    [],
  );
  const componentOf = (command: DslCommand) => {
    const component = command.verb === "ADD" ? command.attributes.component : instances.get(command.id)?.component;

    return typeof component === "string" ? component : null;
  };
  const componentIds = [...new Set(writes.flatMap(({ command }) => componentOf(command) ?? []))];

  if (componentIds.length === 0) {
    return [];
  }

  const [controls, catalog] = await Promise.all([
    agent.readComponentControls({ componentIds }).then((value) => ControlsByIdSchema.parse(value)),
    agent.listIconSets().then((value) => IconSetCatalogSchema.parse(value)),
  ]);
  const projectSets = new Map(catalog.project.map((set) => [set.id, set.displayName]));

  return writes.flatMap(({ command, keys }) => {
    const component = componentOf(command);
    const declared = ComponentControlsSchema.safeParse(component === null ? null : controls[component]);

    return keys.flatMap((key) => {
      const control = declared.success ? declared.data.controls[key] : undefined;
      const setName = control?.type === "icon" && control.set !== undefined ? projectSets.get(control.set) : undefined;

      return setName === undefined
        ? []
        : [
            {
              message: `Framer ignores ${key}="${command.attributes[key]}" on a component instance when the icon comes from the project's vector set "${setName}": the instance keeps the component's default icon. Ask the user to pick it in the editor, or give the component a variant per icon.`,
              targets: [renamedIds[command.id] ?? command.id],
            },
          ];
    });
  });
}
