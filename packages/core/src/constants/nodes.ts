/** About 10k tokens: larger tool results trigger Claude Code's size warning. */
export const NODES_READ_MAX_CHARS = 40_000;

/** How nodes_read answers: XML (default) or serialize()'s JSON as is. */
export const NODE_FORMATS = ["xml", "json"] as const;

/** The narrowest and widest page breakpoints a call may add, in px: phones start around 360, wide desktops at 1920. */
export const BREAKPOINT_MIN_WIDTH = 240;

export const BREAKPOINT_MAX_WIDTH = 3840;
