/** How often the window checks whether the plugin that said hello is still open. */
export const PLUGIN_CLOSED_POLL_MS = 1_000;

/**
 * The plugin says hello every second. A plugin silent this long is gone even though its frame is not closed: Framer
 * reloaded it, or its page broke. The window lets it go, so calls fail at once instead of timing out, and the plugin
 * starts a new session with its next hello.
 */
export const PLUGIN_SILENT_MS = 6_000;
