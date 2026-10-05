import { OperationError } from "../errors.ts";
import type { GradientSpec } from "../types/framer.ts";
import type { FramerPort } from "../types/framer-port.ts";

/**
 * Turns a converted `fill` into what the Plugin API sets: an image URL is uploaded and becomes backgroundImage, a
 * linear gradient becomes Framer's gradient object (built by the runtime, since core cannot import its class), and a
 * fill of any kind clears the other two, so a frame never keeps an old image or gradient over a new color.
 */
export async function withFills(
  attributes: Record<string, unknown>,
  port: FramerPort,
  createGradient: ((spec: GradientSpec) => unknown) | undefined,
): Promise<Record<string, unknown>> {
  if (!("backgroundColor" in attributes)) {
    return attributes;
  }

  const fill = attributes["backgroundColor"];

  if (typeof fill === "object" && fill !== null && "imageUrl" in fill && typeof fill.imageUrl === "string") {
    return {
      ...attributes,
      backgroundColor: null,
      backgroundGradient: null,
      backgroundImage: await port.uploadImage({ image: fill.imageUrl }),
    };
  }

  if (typeof fill === "object" && fill !== null && "gradient" in fill) {
    if (createGradient === undefined) {
      throw new OperationError("UNSUPPORTED_TRANSPORT", "This Framer runtime cannot build gradients.");
    }

    return {
      ...attributes,
      backgroundColor: null,
      backgroundImage: null,
      backgroundGradient: createGradient(fill.gradient as GradientSpec),
    };
  }

  return {
    ...attributes,
    backgroundGradient: null,
    backgroundImage: null,
  };
}
