import { NOT_FOUND_PATH, SEO_DESCRIPTION_RANGE, SEO_TITLE_RANGE } from "../constants/site-checks.ts";
import { isText, walk } from "../layout-audit/tree.ts";
import type { CheckedPage, SiteCheckContext, SiteFinding } from "../types/site-checks.ts";
import { finding } from "./values.ts";

/** Site-wide metadata as the root node keeps it. */
export interface SiteMetadata {
  readonly title: string | null;
  readonly description: string | null;
  readonly socialImage: string | null;
  readonly favicon: string | null;
}

/** A page's own metadata value, nested (`metadata: { title }`) or dotted (`metadata.title`). */
export function pageMeta(attributes: Readonly<Record<string, unknown>>, key: string): string | boolean | null {
  const nested = attributes["metadata"];
  const value =
    typeof nested === "object" && nested !== null
      ? (nested as Record<string, unknown>)[key]
      : attributes[`metadata.${key}`];

  if (typeof value === "boolean") {
    return value;
  }

  if (value === "true" || value === "false") {
    return value === "true";
  }

  return typeof value === "string" && value !== "" && value !== "null" ? value : null;
}

/**
 * What search engines and link previews get: a title and a description of the right length on every page (a page
 * inherits the site's), no title twice, one h1, no page hidden from search but the 404, and a social image and
 * favicon for the site.
 */
export function seoFindings(
  pages: readonly CheckedPage[],
  site: SiteMetadata | null,
  context: SiteCheckContext,
): SiteFinding[] {
  const findings: SiteFinding[] = [];
  const titles = new Map<string, string[]>();

  for (const page of pages) {
    const metadataKnown = Object.keys(page.attributes).length > 0;

    if (metadataKnown) {
      const title = asText(pageMeta(page.attributes, "title")) ?? site?.title ?? null;
      const description = asText(pageMeta(page.attributes, "description")) ?? site?.description ?? null;

      findings.push(...lengthFindings(page.path, "title", title, SEO_TITLE_RANGE));
      findings.push(...lengthFindings(page.path, "description", description, SEO_DESCRIPTION_RANGE));

      if (title !== null && page.path !== NOT_FOUND_PATH) {
        titles.set(title, [...(titles.get(title) ?? []), page.path]);
      }

      if (pageMeta(page.attributes, "noIndex") === true && page.path !== NOT_FOUND_PATH) {
        findings.push(
          finding(
            "no-index",
            "defect",
            page.path,
            null,
            `${page.path} is hidden from search engines (noIndex).`,
            "Set metadata.noIndex to false unless the page must stay out of search.",
          ),
        );
      }
    }

    const h1 =
      page.content === null
        ? []
        : walk(page.content).filter(
            (node) => isText(node) && context.textStyle(node.attributes?.["textStylePreset"])?.tag === "h1",
          );

    if (page.content !== null && h1.length !== 1) {
      findings.push(
        finding(
          "h1-count",
          "likely",
          page.path,
          null,
          `${page.path} has ${h1.length} h1 headings; search engines expect one.`,
          h1.length === 0
            ? "Give the main headline a text style with tag h1."
            : "Keep h1 on the main headline and give the others h2.",
        ),
      );
    }
  }

  for (const [title, paths] of titles) {
    if (paths.length > 1) {
      findings.push(
        finding(
          "duplicate-title",
          "likely",
          paths[1] ?? "/",
          null,
          `"${title}" is the title of ${paths.join(", ")}.`,
          "Give each page its own title, the page's subject first.",
        ),
      );
    }
  }

  if (site !== null && site.socialImage === null) {
    findings.push(
      finding(
        "no-social-image",
        "likely",
        "/",
        null,
        "The site has no social image, so shared links show no preview.",
        "Set metadata.socialImage on the root node: 1200×630, e.g. a screenshot of the hero.",
      ),
    );
  }

  if (site !== null && site.favicon === null) {
    findings.push(
      finding(
        "no-favicon",
        "likely",
        "/",
        null,
        "The site has no favicon.",
        "Set metadata.favicon on the root node: the brand mark as SVG.",
      ),
    );
  }

  return findings;
}

function lengthFindings(
  path: string,
  field: "title" | "description",
  value: string | null,
  [min, max]: readonly [number, number],
): SiteFinding[] {
  if (value === null) {
    return [
      finding(
        `missing-${field}`,
        "defect",
        path,
        null,
        `${path} has no ${field}, and the site has none to inherit.`,
        `Write a ${field} of ${min}–${max} characters.`,
      ),
    ];
  }

  if (value.length < min || value.length > max) {
    return [
      finding(
        `${field}-length`,
        "likely",
        path,
        null,
        `The ${field} of ${path} is ${value.length} characters ("${value}").`,
        `Keep it between ${min} and ${max} characters: search results cut longer ones and shorter ones read thin.`,
      ),
    ];
  }

  return [];
}

function asText(value: string | boolean | null): string | null {
  return typeof value === "string" ? value : null;
}
