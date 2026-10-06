import { wcagContrast } from "culori";
import { CONTRAST_AA, CONTRAST_AA_LARGE, CONTRAST_AAA } from "../constants/site-checks.ts";
import type { SerializedNode } from "../types/dsl.ts";
import type { AuditSeverity } from "../types/layout-audit.ts";
import type { Contrast, SiteCheckContext, SiteFinding } from "../types/site-checks.ts";

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
