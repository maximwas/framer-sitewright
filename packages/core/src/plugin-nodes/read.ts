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
export async function readPluginTree(
  port: FramerPort,
  id: string,
  depth: number,
  within?: () => Promise<string | null>,
): Promise<SerializedNode | null> {
  const found = await locate(port, id, within);

  return found === null ? null : describe(port, found.node, found.parentId, layoutOf(found.parent), depth);
}

/**
 * A node by id, with its parent. Framer's plugin finds a layer by id only on the page open in the editor, yet reads
 * children on any page (seen 22.10.2026: layout_audit of a layer said "not found"): elsewhere the layer is looked for
 * level by level under the node `within` names, its page.
 */
async function locate(
  port: FramerPort,
  id: string,
  within: (() => Promise<string | null>) | undefined,
): Promise<{ node: PluginNodeRecord; parent: PluginNodeRecord | null; parentId: string | null } | null> {
  const node = nodeRecord(await port.getNode(id));

  if (node !== null) {
    const parent = nodeRecord(await port.getParent(id));

    return {
      node,
      parent,
      parentId: parent === null ? null : idOf(parent),
    };
  }

  const rootId = within === undefined ? null : await within();
  let level: { record: PluginNodeRecord | null; id: string }[] =
    rootId === null
      ? []
      : [
          {
            record: null,
            id: rootId,
          },
        ];

  while (level.length > 0) {
    const children = await Promise.all(
      level.map(async (parent) => ({
        parent,
        children: await port.getChildren(parent.id),
      })),
    );
    const next: { record: PluginNodeRecord; id: string }[] = [];

    for (const { parent, children: found } of children) {
      for (const child of found) {
        const record = nodeRecord(child);

        if (record === null) {
          continue;
        }

        if (idOf(record) === id) {
          return {
            node: record,
            parent: parent.record,
            parentId: parent.id,
          };
        }

        next.push({
          record,
          id: idOf(record),
        });
      }
    }

    level = next;
  }

  return null;
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
    ...variantMeta(node),
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
      // getChildren gives the nodes themselves: a second getNode per child only doubled the round trips.
      const record = nodeRecord(child) ?? nodeRecord(await port.getNode(child.id));

      return record === null ? null : describe(port, record, id, layout, depth - 1);
    }),
  );

  return {
    ...described,
    children: read.filter((child) => child !== null),
  };
}

/**
 * Breakpoints as serialize() marks them: the primary breakpoint, and replicas with the node each copies. A replica's
 * layers have compound ids, `<breakpoint id><original id>`, and take overrides by them.
 */
function variantMeta(node: PluginNodeRecord): Pick<SerializedNode, "$isPrimary" | "$isReplica" | "$originalId"> {
  if (node.isPrimaryBreakpoint) {
    return { $isPrimary: true };
  }

  return node.isReplica && typeof node.originalId === "string"
    ? {
        $isReplica: true,
        $originalId: node.originalId,
      }
    : {};
}
