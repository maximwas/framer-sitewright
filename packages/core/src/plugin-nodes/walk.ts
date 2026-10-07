import { FIND_MAX_LAYERS, WALK_CONCURRENCY } from "../constants/nodes.ts";
import type { FramerPort } from "../types/framer-port.ts";
import type { PluginNodeRecord, WalkedLayer, WalkOptions } from "../types/plugin-nodes.ts";
import { mapInOrder } from "../utils/async.ts";
import { nodeRecord } from "./node-record.ts";

interface Branch extends Omit<WalkedLayer, "depth"> {
  children: Branch[];
}

/**
 * Every layer of a page, depth first, through getChildren: the page's own layers and those of its primary breakpoint.
 * The other breakpoints copy the primary one, so walking them would list each layer once per breakpoint; `copies`
 * walks them too, for what a copy holds of its own. The tree is read a level at a time with the level's calls in
 * flight together, since each call is a round trip through the Server API. Stops after FIND_MAX_LAYERS layers;
 * `complete` says whether it saw them all.
 */
export async function pageLayers(
  port: FramerPort,
  pageId: string,
  { copies = false }: WalkOptions = {},
): Promise<{ layers: WalkedLayer[]; complete: boolean }> {
  const branch = (child: unknown, breakpoint: PluginNodeRecord | null): Branch[] => {
    const node = nodeRecord(child);

    return node === null
      ? []
      : [
          {
            node,
            // The top-level breakpoint frames pass themselves down.
            breakpoint: breakpoint ?? (node.isBreakpoint ? node : null),
            children: [],
          },
        ];
  };
  const roots = [...(await port.getChildren(pageId))]
    .filter((child) => copies || !nodeRecord(child)?.isBreakpoint || nodeRecord(child)?.isPrimaryBreakpoint)
    .flatMap((child) => branch(child, null));
  let level = roots;
  let seen = 0;
  let complete = true;

  // The level that passes the limit is listed, but its children are not read.
  while (level.length > 0 && seen <= FIND_MAX_LAYERS) {
    seen += level.length;

    if (seen > FIND_MAX_LAYERS) {
      break;
    }

    const children = await mapInOrder(level, WALK_CONCURRENCY, async ({ node }) => port.getChildren(String(node.id)));
    const next: Branch[] = [];

    level.forEach((parent, index) => {
      parent.children = [...(children[index] ?? [])].flatMap((child) => branch(child, parent.breakpoint));
      next.push(...parent.children);
    });
    level = next;
  }

  const layers: WalkedLayer[] = [];
  const visit = (branches: readonly Branch[], depth: number) => {
    for (const { node, breakpoint, children } of branches) {
      if (layers.length >= FIND_MAX_LAYERS) {
        complete = false;

        return;
      }

      layers.push({
        node,
        breakpoint,
        depth,
      });
      visit(children, depth + 1);
    }
  };

  visit(roots, 0);

  return {
    layers,
    complete,
  };
}
