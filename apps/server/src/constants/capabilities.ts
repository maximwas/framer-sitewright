import type { BranchAccess } from "@sitewright/core";

/**
 * How Framer words a refusal on plan grounds, e.g. "the project plan does not include Redirects" (framer-api docs).
 * A heuristic: no such error has been seen live yet, so the message is always passed on as Framer wrote it.
 */
export const PLAN_LIMIT_PATTERNS: readonly RegExp[] = [
  /\bplan\b[^.]*\b(?:does not|doesn't|do not) include\b/i,
  /\bnot (?:included|available) (?:in|on|with) (?:your|this|the)\b[^.]*\bplan\b/i,
  /\bupgrade\b[^.]*\bplan\b/i,
  /\brequires? (?:a |the )?(?:higher|paid|pro|premium|basic|mini|scale|business|enterprise)\b[^.]*\bplan\b/i,
];

/** What branch access says about the plan: Framer's pricing lists branches from Pro up. */
export const BRANCH_ACCESS_SUMMARIES: Readonly<Record<Exclude<BranchAccess, "unknown">, string>> = {
  available: "Branches are available, so the project's Framer plan is Pro or higher.",
  unavailable:
    "Branches are unavailable, so the project's Framer plan is below Pro (or the project predates branching): features of higher plans may fail. Tell the user before relying on them.",
};

/** Branch access before project_overview (or the plugin window) has checked it. */
export const NOT_CHECKED_YET = "The plan has not been checked yet: project_overview checks it.";
