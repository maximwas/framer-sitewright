import * as z from "zod";
import { SELECTION_WAIT_DEFAULT_SECONDS, SELECTION_WAIT_MAX_SECONDS } from "../../constants/nodes.ts";
import { PRODUCT } from "../../constants/product.ts";
import { OperationError } from "../../errors.ts";
import type { FramerPort } from "../../types/framer-port.ts";
import { countOf } from "../../utils/text.ts";
import { defineOperation } from "../define.ts";

// Core has neither DOM nor Node types; the plugin, where this runs, has these timers.
declare const setTimeout: (callback: () => void, ms: number) => unknown;
declare const clearTimeout: (handle: unknown) => void;

const SelectedSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
});

/** An editor method of the plugin's `framer`, or a refusal that says to open the plugin. */
function editorMethod<
  K extends "setSelection" | "navigateTo" | "zoomIntoView" | "subscribeToSelection" | "getSelection",
>(port: FramerPort, method: K): NonNullable<FramerPort[K]> {
  const found = port[method];

  if (found === undefined) {
    throw new OperationError(
      "UNSUPPORTED_TRANSPORT",
      `Only the ${PRODUCT.title} plugin reaches the open editor.`,
      `Ask the user to open the ${PRODUCT.title} plugin in this project.`,
    );
  }

  return found as NonNullable<FramerPort[K]>;
}

export const editorSelect = defineOperation({
  name: "editor.select",
  effect: "read",
  idempotent: true,
  permissions: [],
  needsPlugin: true,
  input: z.strictObject({
    nodeIds: z
      .array(z.string().min(1))
      .max(100)
      .describe("The layers to select on the canvas; [] clears the selection."),
  }),
  output: z.object({ selected: z.number().int() }),
  async run({ runtime }, { nodeIds }) {
    await editorMethod(runtime.port, "setSelection").call(runtime.port, nodeIds);

    return { selected: nodeIds.length };
  },
  describe(_input, { selected }) {
    return { summary: `${countOf(selected, "layer")} selected` };
  },
});

export const editorNavigate = defineOperation({
  name: "editor.navigate",
  effect: "read",
  idempotent: true,
  permissions: [],
  needsPlugin: true,
  input: z.strictObject({
    nodeId: z.string().min(1).describe("A layer, a page or a CMS item."),
    select: z.boolean().default(true).describe("Select it after scrolling to it."),
    zoom: z.boolean().default(true).describe("Zoom and center the canvas on it."),
  }),
  output: z.object({ nodeId: z.string() }),
  async run({ runtime }, { nodeId, select, zoom }) {
    await editorMethod(runtime.port, "navigateTo").call(runtime.port, nodeId, {
      select,
      zoomIntoView: zoom,
    });

    return { nodeId };
  },
  describe({ nodeId }) {
    return { subject: nodeId };
  },
});

export const editorZoom = defineOperation({
  name: "editor.zoom",
  effect: "read",
  idempotent: true,
  permissions: [],
  needsPlugin: true,
  input: z.strictObject({
    nodeIds: z
      .array(z.string().min(1))
      .min(1)
      .max(100)
      .describe("The layers to fit on screen, without selecting them."),
  }),
  output: z.object({ zoomed: z.number().int() }),
  async run({ runtime }, { nodeIds }) {
    await editorMethod(runtime.port, "zoomIntoView").call(runtime.port, nodeIds);

    return { zoomed: nodeIds.length };
  },
  describe(_input, { zoomed }) {
    return { summary: countOf(zoomed, "layer") };
  },
});

/** The first selection that differs from the one at the start, or null when the time runs out. */
function nextSelection(port: FramerPort, before: readonly string[], seconds: number) {
  const subscribe = editorMethod(port, "subscribeToSelection");
  const start = before.join(",");

  return new Promise<readonly { readonly id: string; readonly name?: string | null }[] | null>((resolve) => {
    let unsubscribe: (() => void) | null = null;
    const done = (nodes: readonly { readonly id: string; readonly name?: string | null }[] | null) => {
      clearTimeout(timer);
      unsubscribe?.();
      resolve(nodes);
    };
    const timer = setTimeout(() => done(null), seconds * 1000);

    unsubscribe = subscribe.call(port, (nodes) => {
      if (nodes.length > 0 && nodes.map(({ id }) => id).join(",") !== start) {
        done(nodes);
      }
    });
  });
}

export const selectionWait = defineOperation({
  name: "selection.wait",
  effect: "read",
  idempotent: true,
  permissions: [],
  needsPlugin: true,
  input: z.strictObject({
    seconds: z
      .number()
      .int()
      .min(1)
      .max(SELECTION_WAIT_MAX_SECONDS)
      .default(SELECTION_WAIT_DEFAULT_SECONDS)
      .describe("How long to wait for the user to select something new."),
  }),
  output: z.object({
    nodes: z.array(SelectedSchema),
    timedOut: z.boolean(),
  }),
  async run({ runtime }, { seconds }) {
    const before = (await editorMethod(runtime.port, "getSelection").call(runtime.port)).map(({ id }) => id);
    const picked = await nextSelection(runtime.port, before, seconds);

    return {
      nodes: (picked ?? []).map(({ id, name }) => ({
        id,
        name: name ?? null,
      })),
      timedOut: picked === null,
    };
  },
  describe(_input, { nodes, timedOut }) {
    return {
      summary: timedOut ? "Nothing picked in time" : `${countOf(nodes.length, "layer")} picked`,
      nodes: nodes.map(({ id, name }) => ({
        id,
        name: name ?? id,
      })),
    };
  },
});
