import { wcagContrast } from "culori";
import { AUDIT_SEVERITIES } from "../constants/layout-audit.ts";
import { CONTRAST_AA, CONTRAST_AA_LARGE, CONTRAST_AAA } from "../constants/site-checks.ts";
import { FOLD_NAMES_MAX } from "../constants/template-audit.ts";
import type { SerializedNode } from "../types/dsl.ts";
import type { AuditIssue, AuditSeverity } from "../types/layout-audit.ts";
import type { Contrast, SiteCheckContext, SiteFinding } from "../types/site-checks.ts";
import { countOf } from "../utils/text.ts";

/** A token reference's id: `var(--token-<id>)` → `<id>`. */
const TOKEN_REF = /^var\(--token-([^)]+)\)$/;

/** A value read as text, whether serialize printed it nested (`link: { href }`) or dotted (`link.href`). */
export function attributeText(node: SerializedNode, name: string): string | null {
  const attributes = node.attributes ?? {};
  const direct = attributes[name];

  if (typeof direct === "string" && direct !== "") {
    return direct;
  }

  const [head, ...rest] = name.split(".");
  let value: unknown = head === undefined ? undefined : attributes[head];

  for (const key of rest) {
    value = typeof value === "object" && value !== null ? (value as Record<string, unknown>)[key] : undefined;
  }

  return typeof value === "string" && value !== "" ? value : null;
}

/**
 * A color the checks can compare: a written color as is, a token as its light value. An image, a gradient, a
 * variable or a see-through color is not one solid color: null.
 */
export function solidColor(value: string | null, context: SiteCheckContext): string | null {
  if (value === null) {
    return null;
  }

  const token = TOKEN_REF.exec(value.trim());
  const color = token?.[1] === undefined ? value : context.token(token[1]);

  if (color === null || /url\(|gradient|^https?:|var\(/i.test(color)) {
    return null;
  }

  const alpha = /rgba?\([^)]*,\s*([\d.]+)\s*\)$/.exec(color.replace(/\s+/g, " "));

  return alpha?.[1] !== undefined && /^rgba/i.test(color) && Number(alpha[1]) < 1 ? null : color;
}

/** WCAG 2 contrast of two colors, rounded to hundredths; null when either is no color. */
export function contrastOf(foreground: string, background: string): Contrast | null {
  let ratio: number;

  try {
    ratio = wcagContrast(foreground, background);
  } catch {
    return null;
  }

  if (!Number.isFinite(ratio)) {
    return null;
  }

  return {
    ratio: Math.round(ratio * 100) / 100,
    aa: ratio >= CONTRAST_AA,
    aaLarge: ratio >= CONTRAST_AA_LARGE,
    aaa: ratio >= CONTRAST_AAA,
  };
}

export function finding(
  rule: string,
  severity: AuditSeverity,
  page: string,
  node: SerializedNode | null,
  message: string,
  fix: string,
): SiteFinding {
  return {
    rule,
    severity,
    page,
    nodeId: node?.id ?? null,
    nodeName: node?.name ?? null,
    message,
    fix,
  };
}

/** A layout audit finding on a page of the site. */
export function fromIssue(page: string, { rule, severity, nodeId, nodeName, message, fix }: AuditIssue): SiteFinding {
  return {
    rule,
    severity,
    page,
    nodeId,
    nodeName,
    message,
    fix,
  };
}

/** The most severe first, and one finding per rule and page: the rest fold into it, which names a few of them. */
export function foldFindings(findings: readonly SiteFinding[]): SiteFinding[] {
  const groups = new Map<string, SiteFinding[]>();

  for (const found of bySeverity(findings)) {
    const key = `${found.rule}:${found.page}`;

    groups.set(key, [...(groups.get(key) ?? []), found]);
  }

  return [...groups.values()].flatMap(([first, ...rest]) => {
    if (first === undefined) {
      return [];
    }

    const names = rest.slice(0, FOLD_NAMES_MAX).map(({ nodeName, nodeId }) => nodeName ?? nodeId ?? "?");

    return rest.length === 0
      ? [first]
      : [
          {
            ...first,
            message: `${first.message} The same on ${countOf(rest.length, "more layer")} (${names.join(", ")}${rest.length > FOLD_NAMES_MAX ? ", …" : ""}).`,
          },
        ];
  });
}

/** Defects first, then likely ones, then matters of taste; in their order within each. */
export function bySeverity(findings: readonly SiteFinding[]): SiteFinding[] {
  return [...findings].sort((a, b) => AUDIT_SEVERITIES.indexOf(a.severity) - AUDIT_SEVERITIES.indexOf(b.severity));
}
