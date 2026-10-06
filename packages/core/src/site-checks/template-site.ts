import { PHONE_MAX_WIDTH_PX, TABLET_MAX_WIDTH_PX, TEMPLATE_RULES } from "../constants/layout-audit.ts";
import { NOT_FOUND_PATH } from "../constants/site-checks.ts";
import { LEGAL_WORDS } from "../constants/template-audit.ts";
import { NARROW_RULES, STYLE_RULES } from "../layout-audit/rules.ts";
import { attr, childrenOf, isFrame, px, walk } from "../layout-audit/tree.ts";
import type { AuditContext } from "../types/layout-audit.ts";
import type { CheckedCollection, CheckedPage, PageTree, SiteFinding } from "../types/site-checks.ts";
import { countOf } from "../utils/text.ts";
import { finding, foldFindings, fromIssue } from "./values.ts";

/**
 * The pages a template needs as a whole: a custom 404, a layout template under every page (when the read can see
 * templates: `complete`), and legal pages when the site collects data through a form.
 */
export function pageSetFindings(
  pages: readonly PageTree[],
  collections: readonly CheckedCollection[],
  complete: boolean,
): SiteFinding[] {
  const findings: SiteFinding[] = [];

  if (!pages.some(({ path }) => path === NOT_FOUND_PATH)) {
    findings.push(
      finding(
        "no-404",
        "defect",
        "/",
        null,
        "The site has no custom 404 page, so a wrong link lands on Framer's default one.",
        `Create a page at ${NOT_FOUND_PATH} (page_create) in the site's style, with a short line and a link home; set metadata.noIndex on it.`,
      ),
    );
  }

  const loose = complete ? pages.filter(({ layoutTemplateId }) => layoutTemplateId === null) : [];

  if (loose.length > 0) {
    findings.push(
      finding(
        "no-layout-template",
        "likely",
        loose[0]?.path ?? "/",
        null,
        `${countOf(loose.length, "page")} ${loose.length === 1 ? "uses" : "use"} no layout template: ${loose.map(({ path }) => path).join(", ")}.`,
        "Put the shared header and footer in a layout template and set it on every page (Page Settings → Layout), so the buyer edits the navigation once.",
      ),
    );
  }

  const withForm = pages.filter(hasForm).map(({ path }) => path);
  const legal =
    pages.some(({ path }) => LEGAL_WORDS.test(path)) || collections.some(({ name }) => LEGAL_WORDS.test(name));

  if (withForm.length > 0 && !legal) {
    findings.push(
      finding(
        "no-legal-pages",
        "likely",
        withForm[0] ?? "/",
        null,
        `There is a form on ${withForm.join(", ")}, but no privacy policy or terms page.`,
        "Add /privacy and /terms (or a Legal CMS collection with a detail page) and link them from the footer and next to the form's submit button.",
      ),
    );
  }

  return findings;
}

/**
 * Desktop, Tablet and Phone breakpoints on the page, each adapted: what the layout audit finds a tablet or phone kept
 * from desktop (a grid's columns, a row of columns, side padding, display type).
 */
export function breakpointFindings(page: PageTree, context: AuditContext): SiteFinding[] {
  if (page.tree === null) {
    return [];
  }

  const breakpoints = childrenOf(page.tree).filter(isFrame);
  const widths = breakpoints.flatMap((breakpoint) => {
    const width = px(attr(breakpoint, "width"));

    return width === null ? [] : [width];
  });
  const missing = [
    widths.some((width) => width > PHONE_MAX_WIDTH_PX && width <= TABLET_MAX_WIDTH_PX) ? null : "Tablet",
    widths.some((width) => width <= PHONE_MAX_WIDTH_PX) ? null : "Phone",
  ].filter((name) => name !== null);
  const adapted = breakpoints
    .filter((breakpoint) => !breakpoint.$isPrimary)
    .flatMap((breakpoint) => NARROW_RULES.flatMap((rule) => rule(breakpoint, context)))
    .map((found) => fromIssue(page.path, found));

  return [
    ...(widths.length === 0 || missing.length === 0
      ? []
      : [
          finding(
            "missing-breakpoints",
            "defect",
            page.path,
            null,
            `${page.path} has no ${missing.join(" and ")} breakpoint: those screens get the desktop layout scaled down.`,
            `Add them with breakpoints_add { pagePath: "${page.path}" } (Tablet 810, Phone 390), then adapt each copy.`,
          ),
        ]),
    ...foldFindings(adapted),
  ];
}

/**
 * Values written on one layer instead of shared styles: text without a text style and written-out colors, as the
 * layout audit finds them, one finding per rule and page. A page breakpoint on a layout template takes its fill from
 * the template, so its own fill is no finding.
 */
export function styleFindings(page: PageTree, context: AuditContext): SiteFinding[] {
  if (page.content === null) {
    return [];
  }

  const root = page.content;
  const found = walk(root)
    .flatMap((node) =>
      STYLE_RULES.flatMap((rule) => rule(node, context)).filter(
        ({ rule }) => !(node === root && page.layoutTemplateId !== null && TEMPLATE_RULES.has(rule)),
      ),
    )
    .map((issue) => fromIssue(page.path, issue));

  return foldFindings(found);
}

/** The shared styles themselves: a template without color tokens or text styles cannot be rebranded in one place. */
export function projectStyleFindings(context: AuditContext): SiteFinding[] {
  return [
    ...(context.hasTokens
      ? []
      : [
          finding(
            "no-color-tokens",
            "defect",
            "/",
            null,
            "The project has no color tokens.",
            "Define the palette as tokens (color_tokens_upsert: Surface/…, Text/…, Accent/…) and use them on every layer, so the buyer rebrands in one place.",
          ),
        ]),
    ...(context.textStyles.length > 0
      ? []
      : [
          finding(
            "no-text-styles",
            "defect",
            "/",
            null,
            "The project has no text styles.",
            "Define the type scale as text styles (text_styles_upsert: Heading/H1…, Body/…) and give every text one.",
          ),
        ]),
  ];
}

/** A form: a frame Framer renders as `<form>`, or its fields. */
function hasForm(page: CheckedPage): boolean {
  return (
    page.content !== null &&
    walk(page.content).some((node) => attr(node, "htmlTag") === "form" || /^Form\w+Node$/.test(node.type))
  );
}
