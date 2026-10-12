import { DSL_CONTROL_PREFIX } from "../../constants/dsl.ts";
import type { SerializedNode } from "../../types/dsl.ts";
import type { FramerPort } from "../../types/framer-port.ts";
import { borderFromShorthand, borderSides, shorthandParts } from "../../utils/border.ts";
import { componentVariablesOf, controlKey, isControlledNode } from "../../utils/controls.ts";

/**
 * The tree with each instance's border control written with its sides. serialize prints a border control set per side
 * as one width ("1px solid <color>", seen 12.10.2026), hiding the sides; the plugin's controls have them. Such a
 * control reads "<top> <right> <bottom> <left> <style> <color>", which design_apply writes back through the plugin.
 */
export async function withBorderSides(port: FramerPort, node: SerializedNode | null): Promise<SerializedNode | null> {
  if (node === null) {
    return null;
  }

  const children =
    node.children === undefined
      ? undefined
      : await Promise.all(node.children.map((child) => withBorderSides(port, child as SerializedNode)));
  const attributes = await attributesWithSides(port, node);

  return {
    ...node,
    ...(attributes === null ? {} : { attributes }),
    ...(children === undefined ? {} : { children }),
  };
}

async function attributesWithSides(port: FramerPort, node: SerializedNode): Promise<Record<string, unknown> | null> {
  const attributes = node.attributes ?? {};
  const borders = Object.entries(attributes).flatMap(([key, value]) =>
    key.startsWith(DSL_CONTROL_PREFIX) &&
    typeof value === "string" &&
    borderFromShorthand(value)?.borderWidth !== undefined
      ? [[key, value] as const]
      : [],
  );

  if (node.type !== "ComponentInstanceNode" || borders.length === 0) {
    return null;
  }

  const instance = await port.getNode(node.id).catch(() => null);

  if (!isControlledNode(instance)) {
    return null;
  }

  const variables = await componentVariablesOf(port, instance);
  const rewritten = borders.flatMap(([key, value]) => {
    const sides = borderSides(instance.controls[controlKey(key, instance.controls, variables)]);
    // The style and color stay as serialize printed them: a token there is the token, the plugin reads it as rgb.
    const [, ...styleAndColor] = shorthandParts(value);

    return sides === null ? [] : [[key, [...sides.map((side) => `${side}px`), ...styleAndColor].join(" ")]];
  });

  return rewritten.length === 0
    ? null
    : {
        ...attributes,
        ...Object.fromEntries(rewritten),
      };
}
