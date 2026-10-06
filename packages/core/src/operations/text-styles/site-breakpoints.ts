import { PIXEL_WIDTH } from "../../constants/text-styles.ts";
import type { CanvasNodeData, FramerPort } from "../../types/framer-port.ts";

/**
 * The widths of the site's page breakpoints, widest first (e.g. 1440, 1280, 810, 390): text style slots start at them
 * (see pluginApiSlots). Every page's, as the DSL counts them: pages may have more breakpoints than the home page.
 */
export async function siteBreakpointWidths(port: FramerPort): Promise<number[]> {
  const pages = await port.getNodesWithType("WebPageNode");
  const children = await Promise.all(pages.map((page) => port.getChildren(page.id)));

  return [...new Set(children.flat().flatMap(breakpointWidth))].sort((a, b) => b - a);
}

/** A breakpoint frame's width in px; nothing for any other node. */
function breakpointWidth(node: CanvasNodeData): number[] {
  const pixels = node.isBreakpoint && typeof node.width === "string" ? PIXEL_WIDTH.exec(node.width) : null;

  return pixels === null ? [] : [Number(pixels[1])];
}
