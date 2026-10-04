import type { SerializedNode } from "../../types/dsl.ts";
import type { AgentPort } from "../../types/framer.ts";
import type { NodePlacement } from "../../types/history.ts";
import { childrenOf, serializedById } from "./serialized.ts";

/** Nodes by id in one serializeNodes call; ids Framer does not find are missing from the map. */
export async function readNodes(
  agent: AgentPort,
  pagePath: string,
  ids: Iterable<string>,
  depth: number,
  attributeFilter?: readonly string[],
): Promise<Map<string, SerializedNode>> {
  const unique = [...new Set(ids)];

  if (unique.length === 0) {
    return new Map();
  }

  const input =
    attributeFilter === undefined
      ? {
          ids: unique,
          depth,
        }
      : {
          ids: unique,
          depth,
          attributeFilter,
        };

  return serializedById(await agent.serializeNodes(input, { pagePath }));
}

/** Where each node sits: its parent and its index among the parent's children. Reads the parents in one call. */
export async function readPlacements(
  agent: AgentPort,
  pagePath: string,
  nodes: Iterable<SerializedNode>,
): Promise<Map<string, NodePlacement>> {
  const withParent = [...nodes].filter((node) => node.$parentId !== undefined);
  const parents = await readNodes(
    agent,
    pagePath,
    withParent.map((node) => node.$parentId ?? ""),
    1,
    [],
  );

  return new Map(
    withParent.flatMap((node) => {
      const parentId = node.$parentId ?? "";
      const siblings = childrenOf(parents.get(parentId) ?? node).map((child) => child.id);
      const index = siblings.indexOf(node.id);

      return index === -1
        ? []
        : [
            [
              node.id,
              {
                parentId,
                index,
              },
            ] as const,
          ];
    }),
  );
}
