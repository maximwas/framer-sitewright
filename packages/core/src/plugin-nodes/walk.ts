import { FIND_MAX_LAYERS } from "../constants/nodes.ts";
import type { FramerPort } from "../types/framer-port.ts";
import type { PluginNodeRecord, WalkOptions, WalkVisitor } from "../types/plugin-nodes.ts";
import { nodeRecord } from "./node-record.ts";

/**
 * Every layer of a page, depth first, through getChildren: the page's own layers and those of its primary breakpoint.
 * The other breakpoints copy the primary one, so walking them would list each layer once per breakpoint; `copies`
 * walks them too, for what a copy holds of its own. Stops after FIND_MAX_LAYERS layers; resolves with whether it saw
 * them all.
 */
export async function walkPage(
  port: FramerPort,
  pageId: string,
  visit: WalkVisitor,
  { copies = false }: WalkOptions = {},
): Promise<boolean> {
  let seen = 0;
  // Each layer with the breakpoint it is on: the top-level breakpoint frames pass themselves down.
  const stack: (readonly [unknown, PluginNodeRecord | null])[] = [...(await port.getChildren(pageId))]
    .filter((child) => copies || !child.isBreakpoint || child.isPrimaryBreakpoint)
    .reverse()
    .map((child) => {
      const record = nodeRecord(child);

      return [child, record?.isBreakpoint ? record : null] as const;
    });

  while (stack.length > 0) {
    const [next, breakpoint] = stack.pop() ?? [null, null];
    const node = nodeRecord(next);

    if (node === null) {
      continue;
    }

    if (++seen > FIND_MAX_LAYERS) {
      return false;
    }

    await visit(node, breakpoint);
    stack.push(
      ...[...(await port.getChildren(String(node.id)))].reverse().map((child) => [child, breakpoint] as const),
    );
  }

  return true;
}
