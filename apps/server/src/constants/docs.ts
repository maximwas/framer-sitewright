/** How long the cached DSL reference counts as fresh. */
export const DOCS_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/** The reference section that lists Framer's implementation guides, one "- <name>" line each. */
export const GUIDE_INDEX_SECTION = "implementation-guidance-documentation-index";

/** The readProject query that returns one implementation guide by its exact name. */
export const GUIDE_QUERY_TYPE = "implementation-guide-from-index";

/** A line of the guide index: "- FAQ". */
export const GUIDE_INDEX_LINE = /^-\s+(.+?)\s*$/;
