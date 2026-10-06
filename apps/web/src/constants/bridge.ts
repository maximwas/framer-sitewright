/** How often the window checks whether the plugin that said hello is still open. */
export const PLUGIN_CLOSED_POLL_MS = 1_000;

/**
 * The plugin says hello every second. A plugin silent this long is gone even though its frame is not closed: Framer
 * reloaded it, or its page broke. The window lets it go, so calls fail at once instead of timing out, and the plugin
 * starts a new session with its next hello.
 */
export const PLUGIN_SILENT_MS = 6_000;

/**
 * The silence a plugin in a hidden editor tab may keep: Chrome runs a background tab's timers about once a minute, so
 * its hellos come that rarely while it still answers every call at once.
 */
export const PLUGIN_SILENT_HIDDEN_MS = 90_000;

/**
 * How often the window says `ready` to the plugin that opened it while no plugin is linked. A plugin reloaded in place
 * (Vite in development, Framer refreshing it) has a new page that knows no window: the announcement lets it link again
 * without Connect.
 */
export const READY_INTERVAL_MS = 1_500;
