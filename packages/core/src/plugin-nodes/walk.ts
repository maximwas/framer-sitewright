import { FIND_MAX_LAYERS } from "../constants/nodes.ts";
import type { FramerPort } from "../types/framer-port.ts";
import type { PluginNodeRecord } from "../types/plugin-nodes.ts";
import { nodeRecord } from "./node-record.ts";

/**
 * Every layer of a page, depth first, through getChildren: the page's own layers and those of its primary breakpoint.
 * The other breakpoints copy the primary one, so walking them would list each layer once per breakpoint. Stops after
 * FIND_MAX_LAYERS layers; resolves with whether it saw them all.
 */
export async function walkPage(
  port: FramerPort,
  pageId: string,
  visit: (node: PluginNodeRecord) => Promise<void> | void,
): Promise<boolean> {
  let seen = 0;
  const stack = [...(await port.getChildren(pageId))]
    .filter((child) => !child.isBreakpoint || child.isPrimaryBreakpoint)
    .reverse();

  while (stack.length > 0) {
    const next = stack.pop();
    const node = nodeRecord(next);

    if (node === null) {
      continue;
    }

    if (++seen > FIND_MAX_LAYERS) {
      return false;
    }

    await visit(node);
    stack.push(...[...(await port.getChildren(String(node.id)))].reverse());
  }

  return true;
}
