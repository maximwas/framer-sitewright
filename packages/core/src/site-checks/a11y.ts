import { CONTRAST_AA, CONTRAST_AA_LARGE, LARGE_TEXT_PX } from "../constants/site-checks.ts";
import { childrenOf, isText, walk } from "../layout-audit/tree.ts";
import type { SerializedNode } from "../types/dsl.ts";
import type { CheckedPage, SiteCheckContext, SiteFinding } from "../types/site-checks.ts";
import { attributeText, contrastOf, finding, solidColor } from "./values.ts";

/**
 * What people who read with difficulty or without a mouse run into: text that does not stand out from the solid
 * color behind it (WCAG AA: 4.5:1, 3:1 for large text), and links that hold no text for a screen reader to say.
 * Text over a photo or a gradient is left out: its background is no single color.
 */
export function a11yFindings(page: CheckedPage, context: SiteCheckContext): SiteFinding[] {
  if (page.content === null) {
    return [];
  }

  const findings: SiteFinding[] = [];

  visit(page.content, solidColor(attributeText(page.content, "fill"), context));

  for (const node of walk(page.content)) {
    const href = attributeText(node, "link.href") ?? attributeText(node, "link");

    if (href !== null && !isText(node) && walk(node).every((inner) => !isText(inner)) && node.type === "FrameNode") {
      findings.push(
        finding(
          "link-without-text",
          "likely",
          page.path,
          node,
          `${node.name ?? node.id} is a link with no text inside, so a screen reader cannot say where it goes.`,
          "Put a text inside (it can be visually small), or link the text-bearing frame instead.",
        ),
      );
    }
  }

  return findings;

  function visit(node: SerializedNode, background: string | null): void {
    const fill = attributeText(node, "fill");
    const own = fill === null ? background : solidColor(fill, context);

    if (isText(node)) {
      const style = context.textStyle(node.attributes?.["textStylePreset"]);
      const foreground =
        solidColor(attributeText(node, "textColor"), context) ?? solidColor(style?.color ?? null, context);
      const contrast = foreground === null || own === null ? null : contrastOf(foreground, own);
      const large = (style?.fontSize ?? 0) >= LARGE_TEXT_PX;
      const needed = large ? CONTRAST_AA_LARGE : CONTRAST_AA;

      if (contrast !== null && contrast.ratio < needed) {
        findings.push(
          finding(
            "low-contrast",
            "defect",
            page.path,
            node,
            `${node.name ?? node.id} has a contrast of ${contrast.ratio}:1 with the color behind it; ${large ? "large " : ""}text needs ${needed}:1.`,
            "Use a darker text token on light backgrounds (or a lighter one on dark), or change the background.",
          ),
        );
      }

      return;
    }

    for (const child of childrenOf(node)) {
      visit(child, own);
    }
  }
}
