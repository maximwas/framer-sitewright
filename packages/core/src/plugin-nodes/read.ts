import type { SerializedNode } from "../types/dsl.ts";
import type { FramerPort } from "../types/framer-port.ts";
import type { PluginNodeRecord } from "../types/plugin-nodes.ts";
import { fromPluginNode } from "./attributes.ts";
import { idOf, layoutOf, nameOf, nodeRecord, textOf } from "./node-record.ts";

/**
 * A node and `depth` levels of children through the Plugin API, in the shape framer.agent.serialize() gives, so the
 * same XML printer and the same undo snapshots work without the agent. A rich text's plain text is its `text`; its
 * blocks and runs, and the attributes only the DSL has, are not there. null when the node is gone.
 */
export async function readPluginTree(port: FramerPort, id: string, depth: number): Promise<SerializedNode | null> {
  const node = nodeRecord(await port.getNode(id));

  if (node === null) {
    return null;
  }

  const parent = nodeRecord(await port.getParent(id));

  return describe(port, node, parent === null ? null : idOf(parent), layoutOf(parent), depth);
}

async function describe(
  port: FramerPort,
  node: PluginNodeRecord,
  parentId: string | null,
  parentLayout: string | null,
  depth: number,
): Promise<SerializedNode> {
  const id = idOf(node);
  const { type, attributes } = fromPluginNode(node, parentLayout);
  const text = await textOf(node);
  const children = await port.getChildren(id);
  const name = nameOf(node);
  const described: SerializedNode = {
    type,
    id,
    ...(name === null ? {} : { name }),
    ...(parentId === null ? {} : { $parentId: parentId }),
    attributes:
      text === null
        ? attributes
        : {
            ...attributes,
            text,
          },
  };

  if (children.length === 0) {
    return described;
  }

  if (depth === 0) {
    return {
      ...described,
      $truncated: true,
      $descendantCount: children.length,
    };
  }

  const layout = layoutOf(node);
  const read = await Promise.all(
    children.map(async (child) => {
      const record = nodeRecord(await port.getNode(child.id)) ?? nodeRecord(child);

      return record === null ? null : describe(port, record, id, layout, depth - 1);
    }),
  );

  return {
    ...described,
    children: read.filter((child) => child !== null),
  };
}
