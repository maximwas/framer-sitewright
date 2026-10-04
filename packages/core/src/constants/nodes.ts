/** About 10k tokens: larger tool results trigger Claude Code's size warning. */
export const NODES_READ_MAX_CHARS = 40_000;

/** How nodes_read answers: XML (default) or serialize()'s JSON as is. */
export const NODE_FORMATS = ["xml", "json"] as const;
