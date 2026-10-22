import type { UIOptions } from "@framer/plugin";
import { PLUGIN_WINDOW } from "../constants/ui.ts";

/** The window options that make the plugin window as tall as its content, within PLUGIN_WINDOW's limits. */
export function fittedWindow(contentHeight: number, width: number): UIOptions {
  const minHeight = PLUGIN_WINDOW.minHeight ?? 0;
  const maxHeight = PLUGIN_WINDOW.maxHeight ?? Number.POSITIVE_INFINITY;

  return {
    width: Math.round(width),
    height: Math.min(maxHeight, Math.max(minHeight, contentHeight)),
    resizable: PLUGIN_WINDOW.resizable ?? false,
    minWidth: PLUGIN_WINDOW.minWidth ?? 0,
    minHeight,
    maxWidth: PLUGIN_WINDOW.maxWidth ?? Number.POSITIVE_INFINITY,
    maxHeight,
  };
}
