import * as z from "zod";
import { OperationError } from "../../errors.ts";
import { borderFromShorthand, isBorderValue, mergeBorder } from "../../utils/border.ts";
import {
  componentVariablesOf,
  controlKey,
  holdsValue,
  isControlledNode,
  mergeControls,
  withTokenColors,
  withUploadedImages,
} from "../../utils/controls.ts";
import { isPlainObject } from "../../utils/guards.ts";
import { defineOperation } from "../define.ts";

/**
 * Sets control values on a component instance through setAttributes, objects included: a code component's object
 * controls (arrows, dots, clipping) are refused by the DSL as "unsupported type object" (seen 01.10.2026). Only the
 * controls named are written: the plugin reads the others resolved (a color token as rgb), so writing them back would
 * unbind them (seen 12.10.2026). A project component's instance keys its controls by variable id: a control named as
 * the component or the DSL names it is found by its variable. A border control takes a CSS-like shorthand, per side
 * too, which the DSL refuses (seen 12.10.2026).
 */
export const componentControlsSet = defineOperation({
  name: "components.setControls",
  effect: "write",
  idempotent: true,
  permissions: ["Node.setAttributes"],
  input: z.strictObject({
    nodeId: z.string().min(1).describe("The component instance (ComponentInstanceNode) to set."),
    controls: z
      .record(z.string(), z.unknown())
      .describe(
        'Control values by the names the component declares (e.g. arrows, dots, Border) or by variable id. An object control merges with the instance\'s current value. A border control also takes "1px solid <color>" or, per side in CSS order, "0 0 1px 1px solid var(--token-<id>)".',
      ),
  }),
  output: z.object({
    nodeId: z.string(),
    /** The instance's layer name, for the activity panel; null when it has none. */
    name: z.string().nullable(),
    /** The controls as the instance holds them after the write. */
    controls: z.record(z.string(), z.unknown()),
    /** Controls written that Framer did not keep: set them with design_apply $control__… or in the editor. */
    notStored: z.array(z.string()),
  }),
  async run({ runtime, history }, { nodeId, controls }) {
    const node = await runtime.port.getNode(nodeId);

    if (!isControlledNode(node)) {
      throw new OperationError(
        "NOT_FOUND",
        `No component instance with controls has the id "${nodeId}".`,
        "Read the page with nodes_read for the instance's id.",
      );
    }

    const variables = await componentVariablesOf(runtime.port, node);
    const borderKeys = new Set<string>();
    const keyed = Object.fromEntries(
      Object.entries(controls).map(([name, value]) => {
        const key = controlKey(name, node.controls, variables);
        const border =
          variables.find((variable) => variable.id === key)?.type === "border" || isBorderValue(node.controls[key]);

        if (!border) {
          return [key, value];
        }

        const patch = typeof value === "string" ? borderFromShorthand(value) : value;

        if (!isPlainObject(patch)) {
          throw new OperationError(
            "INVALID_INPUT",
            `${name} is a border: "${String(value)}" is not one.`,
            'Write it as "1px solid <color>", or per side in CSS order as "0 0 1px 1px solid <color>"; the color may be var(--token-<id>).',
          );
        }

        borderKeys.add(key);

        return [key, patch];
      }),
    );
    const uploaded = await withUploadedImages(keyed, (url, alt) =>
      runtime.port.uploadImage({
        image: url,
        ...(alt === null ? {} : { altText: alt }),
      }),
    );
    const next = mergeControls(node.controls, uploaded);

    for (const key of borderKeys) {
      const patch = uploaded[key];

      next[key] = mergeBorder(node.controls[key], isPlainObject(patch) ? patch : {});
    }

    const written = Object.fromEntries(Object.keys(uploaded).map((key) => [key, next[key]]));

    const name = node.name ?? null;

    await node.setAttributes({ controls: written });
    history?.markIncomplete(`Controls of ${name ?? nodeId} set: undo does not restore component controls.`);

    // Framer refuses some values without an error (a transition object, an image list): read what it kept. It reads a
    // bound token back as its color, so a written token is compared as that color.
    const after = await runtime.port.getNode(nodeId).catch(() => null);
    const stored = isControlledNode(after) ? after.controls : next;
    const tokens = JSON.stringify(written).includes("var(--token-")
      ? await runtime.port.getColorStyles().catch(() => [])
      : [];

    return {
      nodeId,
      name,
      controls: { ...stored },
      notStored: Object.keys(controls).filter((control) => {
        const key = controlKey(control, node.controls, variables);

        return !holdsValue(stored[key], withTokenColors(next[key], tokens));
      }),
    };
  },
  describe({ controls }, { nodeId, name }) {
    return {
      subject: Object.keys(controls).join(", "),
      nodes: [
        {
          id: nodeId,
          name: name ?? nodeId,
        },
      ],
    };
  },
});
