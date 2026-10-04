import * as z from "zod";
import { OperationError } from "../../errors.ts";
import { addBreakpoint, breakpointWidthOf, pageBreakpoints } from "../../plugin-nodes/breakpoints.ts";
import { BreakpointSpecSchema, PageBreakpointSchema } from "../../schemas/breakpoints.ts";
import { defineOperation } from "../define.ts";
import { pageRootId } from "./read-tree.ts";

/**
 * Adds breakpoints to a page. Each is a copy (replica) of the primary breakpoint: its layers have compound ids,
 * `<breakpoint id><node id>`, and take overrides by them. Runs on the Plugin API (WebPageNode.addBreakpoint), so it
 * needs no Server API key. A width the page has already is left alone, so the call can be repeated.
 */
export const breakpointsAdd = defineOperation({
  name: "breakpoints.add",
  effect: "write",
  idempotent: true,
  permissions: ["WebPageNode.addBreakpoint"],
  input: z.strictObject({
    pagePath: z.string().startsWith("/").default("/").describe('Page to add them to, e.g. "/".'),
    breakpoints: z
      .array(BreakpointSpecSchema)
      .min(1)
      .max(4)
      .describe('E.g. [{ "name": "Tablet", "width": 810 }, { "name": "Phone", "width": 390 }].'),
  }),
  output: z.object({
    pageId: z.string(),
    /** Every breakpoint of the page after the call, widest first. */
    breakpoints: z.array(PageBreakpointSchema),
  }),
  async run({ runtime, history }, { pagePath, breakpoints }) {
    const port = runtime.port;
    const pageId = await pageRootId(runtime, pagePath);
    const existing = await pageBreakpoints(port, pageId);
    const primary = existing.find((frame) => frame.isPrimaryBreakpoint) ?? existing[0];

    if (primary === undefined) {
      throw new OperationError(
        "NOT_FOUND",
        `Page ${pagePath} has no breakpoint to copy.`,
        "Build the page's primary breakpoint (Desktop) first.",
      );
    }

    const widths = new Set(existing.map(breakpointWidthOf));
    const added = new Set<string>();

    for (const spec of breakpoints) {
      if (widths.has(spec.width)) {
        continue;
      }

      const id = await addBreakpoint(port, pageId, primary.id, spec);

      widths.add(spec.width);
      added.add(id);
      history?.record({
        kind: "node",
        id,
        type: "FrameNode",
        name: spec.name,
        pagePath,
        change: "created",
        before: null,
        after: {
          parentId: pageId,
          index: null,
          attributes: { width: `${spec.width}px` },
          nodes: [],
          overrides: {},
        },
      });
    }

    const after = await pageBreakpoints(port, pageId);

    return {
      pageId,
      breakpoints: after
        .map((frame) => ({
          id: frame.id,
          name: frame.name ?? null,
          width: breakpointWidthOf(frame),
          primary: frame.isPrimaryBreakpoint ?? false,
          added: added.has(frame.id),
        }))
        .sort((a, b) => (b.width ?? 0) - (a.width ?? 0)),
    };
  },
  describe({ pagePath }, { breakpoints }) {
    const added = breakpoints.filter((frame) => frame.added);

    return {
      subject: `Page ${pagePath}`,
      summary:
        added.length === 0
          ? "The page had these widths already"
          : added.map((frame) => `${frame.name ?? "Breakpoint"} ${frame.width}`).join(", "),
      nodes: added.map((frame) => ({
        id: frame.id,
        name: frame.name ?? frame.id,
      })),
    };
  },
});
