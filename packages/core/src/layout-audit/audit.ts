import { AUDIT_MAX_ISSUES, AUDIT_SEVERITIES, BREAKPOINT_SIZE_RULES } from "../constants/layout-audit.ts";
import type { SerializedNode } from "../types/dsl.ts";
import type { FramerPort, TextStyleData } from "../types/framer-port.ts";
import type { AuditContext, AuditIssue, AuditTextStyle } from "../types/layout-audit.ts";
import { BREAKPOINT_RULES, CONTENT_RULES, NODE_RULES, projectIssues } from "./rules.ts";
import { childrenOf, isNode, walk } from "./tree.ts";

/**
 * Finds classes of layout defects in a node tree, as nodes_read reads it (the same through the plugin and the Server
 * API): mixed alignment, ragged cards, text links, widths that do not line up, layouts a narrow breakpoint keeps from
 * desktop, template habits. Read-only and deterministic. A page node also gets the checks of each breakpoint, the
 * content checks once (on its primary breakpoint: the others copy its content), and the project's text styles.
 */
export function auditTree(root: SerializedNode, context: AuditContext): AuditIssue[] {
  if (!isNode(root)) {
    return [];
  }

  const breakpoints = childrenOf(root);
  // A breakpoint's width is the window it starts at and its height comes from a layout template: not content sizes.
  const frames = new Set(
    [...(root.type === "WebPageNode" ? breakpoints : []), ...(root.$isPrimary || root.$isReplica ? [root] : [])].map(
      (node) => node.id,
    ),
  );
  const nodeIssues = walk(root)
    .flatMap((node) => NODE_RULES.flatMap((rule) => rule(node, context)))
    .filter((found) => !(frames.has(found.nodeId) && BREAKPOINT_SIZE_RULES.has(found.rule)));
  const primary = breakpoints.find((breakpoint) => breakpoint.$isPrimary) ?? breakpoints[0];
  const pageIssues =
    root.type === "WebPageNode"
      ? [
          ...breakpoints.flatMap((breakpoint) => BREAKPOINT_RULES.flatMap((rule) => rule(breakpoint, context))),
          ...(primary === undefined ? [] : CONTENT_RULES.flatMap((rule) => rule(primary, context))),
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
  const size = cssPx(style.fontSize);

  // Breakpoint slots run widest to narrowest: the last one is what phones get.
  const narrowest = style.breakpoints.at(-1)?.fontSize ?? style.fontSize;

  return {
    name: style.name,
    tag: style.tag,
    alignment: style.alignment,
    transform: style.transform,
    family: style.font.family,
    balance: style.balance,
    fontSize: size,
    narrowFontSize: cssPx(narrowest),
    letterSpacing: relative(style.letterSpacing, size),
    lineHeight: relative(style.lineHeight, size),
  };
}

function cssPx(value: string): number | null {
  const match = /^(-?\d+(?:\.\d+)?)px$/.exec(value.trim());

  return match?.[1] === undefined ? null : Number(match[1]);
}

/** A length relative to the font size: "-0.03em" → -0.03, "110%" → 1.1, "-2px" at 64px → -0.03125. */
function relative(value: string, size: number | null): number | null {
  const match = /^(-?\d+(?:\.\d+)?)(em|%|px)?$/.exec(value.trim());

  if (match?.[1] === undefined) {
    return null;
  }

  const number = Number(match[1]);

  switch (match[2]) {
    case "%":
      return number / 100;
    case "px":
      return size === null || size === 0 ? null : number / size;
    default:
      return number;
  }
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
