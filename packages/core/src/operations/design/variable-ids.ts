import { serializedById } from "../../history/dsl/serialized.ts";
import { SerializedVariablesSchema } from "../../schemas/dsl.ts";
import type { AgentPort } from "../../types/framer.ts";
import type { XmlVariable } from "../../types/xml.ts";

/**
 * Real ids of the variables a batch created, by temp id. Framer leaves variables out of renamedIds, so each one is
 * found by name among its scope's variables; a name used twice there picks the last, which the batch appended.
 */
export async function resolveVariableIds(
  agent: AgentPort,
  pagePath: string,
  variables: readonly XmlVariable[],
  renamedIds: Readonly<Record<string, string>>,
): Promise<Record<string, string>> {
  const pending = variables.filter((variable) => renamedIds[variable.tempId] === undefined);

  if (pending.length === 0) {
    return {};
  }

  const scopeOf = (variable: XmlVariable) => renamedIds[variable.scope] ?? variable.scope;
  const scopes = serializedById(
    await agent.serializeNodes(
      {
        ids: [...new Set(pending.map(scopeOf))],
        depth: 0,
      },
      { pagePath },
    ),
  );
  const found: Record<string, string> = {};

  for (const variable of pending) {
    const declared = SerializedVariablesSchema.safeParse(scopes.get(scopeOf(variable))?.variables);
    const match = declared.success
      ? declared.data.findLast((candidate) => candidate.name === variable.name)
      : undefined;

    if (match !== undefined) {
      found[variable.tempId] = match.id;
    }
  }

  return found;
}
