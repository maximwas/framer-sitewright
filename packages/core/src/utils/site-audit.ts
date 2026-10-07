import type { SiteFinding } from "../types/site-checks.ts";

/** How many pages and rules the roll-up names. */
export const WORST_PAGES = 3;
export const TOP_RULES = 15;

/** One check's findings counted by severity, with the pages that have the most. */
export function rollUp(check: string, findings: readonly SiteFinding[]) {
  const byPage = new Map<string, number>();

  for (const { page } of findings) {
    byPage.set(page, (byPage.get(page) ?? 0) + 1);
  }

  return {
    check,
    defects: findings.filter(({ severity }) => severity === "defect").length,
    likely: findings.filter(({ severity }) => severity === "likely").length,
    taste: findings.filter(({ severity }) => severity === "taste").length,
    worstPages: [...byPage]
      .sort(([pageA, a], [pageB, b]) => b - a || pageA.localeCompare(pageB))
      .slice(0, WORST_PAGES)
      .map(([page, count]) => ({
        page,
        count,
      })),
  };
}

/** The rules hit most often across every check. */
export function topRules(findings: readonly SiteFinding[]) {
  const counts = new Map<string, number>();

  for (const { rule } of findings) {
    counts.set(rule, (counts.get(rule) ?? 0) + 1);
  }

  return [...counts]
    .sort(([ruleA, a], [ruleB, b]) => b - a || ruleA.localeCompare(ruleB))
    .slice(0, TOP_RULES)
    .map(([rule, count]) => ({
      rule,
      count,
    }));
}
