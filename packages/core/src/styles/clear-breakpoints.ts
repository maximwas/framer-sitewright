import type { TextStyleHandle } from "../types/framer-port.ts";

/**
 * Framer bug (checked live on 29.09.2026): remove() on a text style with breakpoints hides it from the Plugin API
 * but leaves the preset in the DSL view, even in new sessions. Clearing the breakpoints first removes it fully.
 */
export async function clearBreakpoints(style: TextStyleHandle): Promise<void> {
  if (style.breakpoints.length > 0) {
    await style.setAttributes({ breakpoints: [] });
  }
}
