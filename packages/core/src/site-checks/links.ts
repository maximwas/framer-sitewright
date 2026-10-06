import { MAILTO_ADDRESS, TEL_NUMBER } from "../constants/site-checks.ts";
import { walk } from "../layout-audit/tree.ts";
import type { SerializedNode } from "../types/dsl.ts";
import type { CheckedPage, LinkKind, SiteFinding, SiteLink } from "../types/site-checks.ts";
import { attributeText, finding } from "./values.ts";

/** A link control of a component instance: `$control__link`, `$control__ctaLink`… */
const LINK_CONTROL = /^\$control__\w*link$/i;

export function linkKind(href: string): LinkKind {
  if (href.startsWith("var(")) {
    return "variable";
  }

  if (/^mailto:/i.test(href)) {
    return "mail";
  }

  if (/^tel:/i.test(href)) {
    return "phone";
  }

  if (/^[a-z][\w+.-]*:\/\//i.test(href)) {
    return "external";
  }

  if (href.startsWith("#")) {
    return "anchor";
  }

  return href.startsWith("/") ? "page" : "other";
}

/** Every link on a page: on frames (`link.href`) and in link controls of component instances. */
export function linksOf(page: CheckedPage): SiteLink[] {
  return page.content === null
    ? []
    : walk(page.content).flatMap((node) => hrefsOf(node).map((href) => link(page, node, href)));
}

/** The ids a page can be scrolled to: its layers' `elementId`s. */
export function anchorsOf(page: CheckedPage): Set<string> {
  return new Set(
    page.content === null
      ? []
      : walk(page.content).flatMap((node) => {
          const id = attributeText(node, "elementId");

          return id === null ? [] : [id];
        }),
  );
}

/**
 * Links that lead nowhere: a page path the site does not have, an anchor no layer on the target page carries (only
 * when the read shows anchors), a mailto without an address, a tel without a number.
 */
export function linkFindings(pages: readonly CheckedPage[], links: readonly SiteLink[]): SiteFinding[] {
  const paths = new Set(pages.map(({ path }) => path));
  const anchors = new Map(pages.map((page) => [page.path, page.complete ? anchorsOf(page) : null]));

  return links.flatMap((found) => {
    const node = {
      type: "Node",
      id: found.nodeId,
      ...(found.nodeName === null ? {} : { name: found.nodeName }),
    } satisfies SerializedNode;
    const href = found.href;

    switch (found.kind) {
      case "mail": {
        const address = decodeURIComponent(href.replace(/^mailto:/i, "").split("?")[0] ?? "");

        return MAILTO_ADDRESS.test(address)
          ? []
          : [
              finding(
                "bad-mailto",
                "defect",
                found.page,
                node,
                `${href} has no valid e-mail address.`,
                "Write mailto:name@domain.com, with ?subject= after it if needed.",
              ),
            ];
      }
      case "phone":
        return TEL_NUMBER.test(href.replace(/^tel:/i, ""))
          ? []
          : [
              finding(
                "bad-tel",
                "defect",
                found.page,
                node,
                `${href} is not a phone number.`,
                "Write tel:+<country code><number>, digits only.",
              ),
            ];
      case "page":
      case "anchor": {
        const [rawPath = "", hash] = href.split("#");
        const path = found.kind === "anchor" ? found.page : (rawPath.split("?")[0] ?? "") || "/";

        if (path.includes(":")) {
          return [];
        }

        if (!paths.has(path)) {
          return [
            finding(
              "broken-link",
              "defect",
              found.page,
              node,
              `${href} leads to ${path}, which is not a page of this site.`,
              "Link to an existing page, or create the page.",
            ),
          ];
        }

        const known = anchors.get(path);

        return hash === undefined || hash === "" || known === null || known === undefined || known.has(hash)
          ? []
          : [
              finding(
                "missing-anchor",
                "defect",
                found.page,
                node,
                `${href} scrolls to #${hash}, but no layer on ${path} has that elementId.`,
                `Give the target section elementId="${hash}" and scrollTargetEnabled="true".`,
              ),
            ];
      }
      default:
        return [];
    }
  });
}

function hrefsOf(node: SerializedNode): string[] {
  const own = attributeText(node, "link.href") ?? attributeText(node, "link");
  const controls = Object.entries(node.attributes ?? {}).flatMap(([name, value]) =>
    LINK_CONTROL.test(name) && typeof value === "string" && value !== "" ? [value] : [],
  );

  return [...(own === null ? [] : [own]), ...controls];
}

function link(page: CheckedPage, node: SerializedNode, href: string): SiteLink {
  return {
    page: page.path,
    nodeId: node.id,
    nodeName: node.name ?? null,
    href,
    kind: linkKind(href),
  };
}
