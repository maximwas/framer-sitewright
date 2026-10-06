/** How long the cached DSL reference counts as fresh. */
export const DOCS_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/** The reference section that lists Framer's implementation guides, one "- <name>" line each. */
export const GUIDE_INDEX_SECTION = "implementation-guidance-documentation-index";

/** The readProject query that returns one implementation guide by its exact name. */
export const GUIDE_QUERY_TYPE = "implementation-guide-from-index";

/** A line of the guide index: "- FAQ". */
export const GUIDE_INDEX_LINE = /^-\s+(.+?)\s*$/;

/**
 * The reference's sections that `framer_docs` section "essentials" reads in one go, in this order: what to never do,
 * how Framer thinks about a project, the command syntax with its computed values, the design rules, the reminders.
 */
export const ESSENTIAL_SECTIONS = [
  "guardrails",
  "core-principles",
  "updating-the-project",
  "design-rules",
  "critical-reminders",
] as const;

/** The section name that asks `framer_docs` for the essential sections together. */
export const ESSENTIALS_SECTION = "essentials";
