import { planCapture } from "../../history/dsl/capture.ts";
import { readNodes } from "../../history/dsl/read-nodes.ts";
import { ComponentCatalogSchema } from "../../schemas/assets.ts";
import { SerializedVariablesSchema } from "../../schemas/dsl.ts";
import type { DslCommand } from "../../types/dsl.ts";
import type { AgentPort } from "../../types/framer.ts";

/**
 * The variables a batch sets or deletes. Framer finds a variable only once its scope is loaded in the session: after a
 * reconnect, `SET <variable id>` alone fails with "The target does not exist" until something reads that component
 * (spike 01.10.2026). So the targets that are not nodes are looked up among the components' variables, and that read
 * loads their scopes. The ids come back so the journal does not take them for unreadable nodes.
 */
export async function loadVariableTargets(
  agent: AgentPort,
  pagePath: string,
  commands: readonly DslCommand[],
  pageRoot: () => Promise<string | null> = async () => null,
): Promise<ReadonlySet<string>> {
  const created = new Set(commands.flatMap((command) => (command.verb === "ADD" ? [command.id] : [])));
  // A variable used in a value (var(--variable-<id>)) needs its scope loaded as much as one that is set.
  const referenced = commands.flatMap((command) =>
    Object.values(command.attributes).flatMap((value) =>
      [...value.matchAll(/var\(--variable-([^)\s]+)\)/g)].flatMap(([, id]) =>
        id === undefined || created.has(id) ? [] : [id],
      ),
    ),
  );
  const ids = [
    ...new Set([
      ...planCapture(commands).targets.flatMap((target) =>
        target.change === "updated" || target.change === "deleted" ? [target.id] : [],
      ),
      ...referenced,
    ]),
  ];

  if (ids.length === 0) {
    return new Set();
  }

  const nodes = await readNodes(agent, pagePath, ids, 0, []);
  const missing = new Set(ids.filter((id) => !nodes.has(id)));

  if (missing.size === 0) {
    return new Set();
  }

  const catalog = ComponentCatalogSchema.parse(await agent.listComponents());
  const scopes = await readNodes(
    agent,
    pagePath,
    catalog.project.canvas.map(({ id }) => id),
    0,
  );

  const found = new Set(
    [...scopes.values()].flatMap((scope) => {
      const declared = SerializedVariablesSchema.safeParse(scope.variables);

      return declared.success ? declared.data.flatMap(({ id }) => (missing.has(id) ? [id] : [])) : [];
    }),
  );

  if ([...missing].every((id) => found.has(id))) {
    return found;
  }

  // Not a component's: the page's own variables, whose scope is the page itself (read in full, not by structure).
  const rootId = await pageRoot();
  const root = rootId === null ? undefined : (await readNodes(agent, pagePath, [rootId], 0)).get(rootId);
  const declared = SerializedVariablesSchema.safeParse(root?.variables);

  for (const { id } of declared.success ? declared.data : []) {
    if (missing.has(id)) {
      found.add(id);
    }
  }

  return found;
}
