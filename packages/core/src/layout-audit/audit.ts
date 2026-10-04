import { AUDIT_MAX_ISSUES, AUDIT_SEVERITIES } from "../constants/layout-audit.ts";
import type { SerializedNode } from "../types/dsl.ts";
import type { FramerPort, TextStyleData } from "../types/framer-port.ts";
import type { AuditContext, AuditIssue, AuditTextStyle } from "../types/layout-audit.ts";
import { NODE_RULES, PAGE_RULES, projectIssues } from "./rules.ts";
import { childrenOf, isNode, walk } from "./tree.ts";

/**
 * Finds classes of layout defects in a node tree, as nodes_read reads it (the same through the plugin and the Server
 * API): mixed alignment, ragged cards, text links, widths that do not line up, template habits. Read-only and
 * deterministic. A page node also gets the checks across its breakpoints and the project's text styles.
 */
export function auditTree(root: SerializedNode, context: AuditContext): AuditIssue[] {
  if (!isNode(root)) {
    return [];
  }

  const nodeIssues = walk(root).flatMap((node) => NODE_RULES.flatMap((rule) => rule(node, context)));
  const pageIssues =
    root.type === "WebPageNode"
      ? [
          ...childrenOf(root).flatMap((breakpoint) => PAGE_RULES.flatMap((rule) => rule(breakpoint, context))),
          ...projectIssues(root, context),
        ]
      : [];

  return rankIssues([...nodeIssues, ...pageIssues]);
}

/** The project facts the audit needs, read once per audit. */
export async function auditContext(port: FramerPort): Promise<AuditContext> {
  const [styles, colors] = await Promise.all([port.getTextStyles(), port.getColorStyles()]);
  const lookup = new Map<string, AuditTextStyle>();

  for (const style of styles) {
    const summary = summarize(style);

    for (const key of [style.id, style.path, style.path.replace(/^\//, ""), style.name]) {
      lookup.set(key, summary);
    }
  }

  return {
    textStyle: (preset) => (typeof preset === "string" ? (lookup.get(preset) ?? null) : null),
    textStyles: styles.map(summarize),
    hasTokens: colors.length > 0,
  };
}

function summarize(style: TextStyleData): AuditTextStyle {
  return {
    tag: style.tag,
    alignment: style.alignment,
    transform: style.transform,
    family: style.font.family,
    balance: style.balance,
  };
}

/**
 * One finding per rule and node, the most severe first, capped. Repeats of the same finding (six cards built alike)
 * fold into the first, which says how many more there are.
 */
export function rankIssues(issues: readonly AuditIssue[]): AuditIssue[] {
  const unique = new Map(issues.map((found) => [`${found.rule}:${found.nodeId}`, found]));
  const groups = new Map<string, AuditIssue[]>();

  for (const found of unique.values()) {
    const key = `${found.rule}:${found.message}`;

    groups.set(key, [...(groups.get(key) ?? []), found]);
  }

  return [...groups.values()]
    .map(([first, ...rest]) =>
      rest.length === 0 || first === undefined
        ? first
        : {
            ...first,
            message: `${first.message} The same in ${rest.length} more like it (${rest.map(({ nodeId }) => nodeId).join(", ")}).`,
          },
    )
    .filter((found) => found !== undefined)
    .sort((a, b) => AUDIT_SEVERITIES.indexOf(a.severity) - AUDIT_SEVERITIES.indexOf(b.severity))
    .slice(0, AUDIT_MAX_ISSUES);
}
