/** About 10k tokens: larger tool results trigger Claude Code's size warning. */
export const NODES_READ_MAX_CHARS = 40_000;

/** How nodes_read answers: XML (default) or serialize()'s JSON as is. */
export const NODE_FORMATS = ["xml", "json"] as const;

/** The narrowest and widest page breakpoints a call may add, in px: phones start around 360, wide desktops at 1920. */
export const BREAKPOINT_MIN_WIDTH = 240;

export const BREAKPOINT_MAX_WIDTH = 3840;

/** Layers nodes_find and text_replace look at, at most, before they stop: a page of a big site, not a runaway walk. */
export const FIND_MAX_LAYERS = 20_000;

/**
 * Plugin API calls a page walk keeps in flight at once: through the Server API each call is a round trip, so a page
 * read one layer after another took minutes (text_replace, 123 s on a one-page template).
 */
export const WALK_CONCURRENCY = 16;

/** Matches nodes_find returns by default, and at most. */
export const FIND_LIMIT = 50;
export const FIND_LIMIT_MAX = 200;

/** A found text is cut to this many characters in the answer. */
export const FIND_TEXT_MAX = 160;

/**
 * What a text replacement does to the formatting inside the layer: "kept" (Framer replaces inside the runs: bold,
 * links and lists stay), "partial" (a match crosses runs formatted differently and takes the formatting of the run it
 * starts in), "plain" (no Server API key: the layer is rewritten as plain text).
 */
export const TEXT_FORMATTING = ["kept", "partial", "plain"] as const;

/** What the journal says after page, redirect and publishing changes it cannot take back. */
export const PAGES_UNDO_NOTE = "Undo does not create or delete pages: use page_create or page_delete.";
export const REDIRECTS_UNDO_NOTE = "Undo does not restore redirects yet; the previous ones are in the result.";

/** Deployments deployments_list returns by default, and at most. */
export const DEPLOYMENTS_LIMIT = 10;
export const DEPLOYMENTS_LIMIT_MAX = 50;
