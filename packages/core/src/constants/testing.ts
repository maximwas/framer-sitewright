import type { TextAlignment } from "../types/framer-port.ts";

/** How the fake stores a DSL alignment: like Framer, start and end become left and right. */
export const DSL_ALIGNMENTS: Readonly<Record<string, TextAlignment>> = {
  start: "left",
  end: "right",
  left: "left",
  center: "center",
  right: "right",
  justify: "justify",
};

/** A text style preset's breakpoint attribute, e.g. `breakpoint.medium.fontSize`. */
export const BREAKPOINT_ATTRIBUTE = /^breakpoint\.(\w+)\.(fontSize|letterSpacing|lineHeight|paragraphSpacing)$/;

/** The fake screenshot: just the eight bytes every PNG starts with. */
export const PNG_SIGNATURE = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
