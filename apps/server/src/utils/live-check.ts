import type { SiteFinding } from "@sitewright/core";
import {
  HIDDEN_CLASS,
  HIDDEN_RULE,
  HTML_ENTITIES,
  LIVE_HTML_HEAVY_BYTES,
  LIVE_IMAGES_HEAVY,
  LIVE_QUOTE_MAX,
  LOADED_LINK_RELS,
  RAW_TEXT_TAGS,
  RESOURCE_ATTRIBUTES,
  TEXT_ATTRIBUTES,
  UNRESOLVED_VALUE,
  VOID_TAGS,
} from "../constants/live-check.ts";
import type { HtmlScan, ValueLeak, WidthRange } from "../types/live-check.ts";

/** One piece of HTML: a comment, a raw-text element (script, style…), a closing or opening tag, a doctype, or text. */
const TOKEN = new RegExp(
  [
    String.raw`<!--[\s\S]*?-->`,
    String.raw`<(${RAW_TEXT_TAGS.join("|")})\b((?:[^>"']|"[^"]*"|'[^']*')*)>[\s\S]*?<\/\1\s*>`,
    String.raw`<\/([a-zA-Z][\w:-]*)\s*>`,
    String.raw`<([a-zA-Z][\w:-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>`,
    "<![^>]*>",
    "([^<]+)",
    "<",
  ].join("|"),
  "g",
);

const ATTRIBUTE = /([^\s"'>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

/**
 * What the checks need from a page's HTML, read in one pass: its title and meta tags, the h1 headings a visitor sees at
 * one width (Framer renders a copy per breakpoint and hides the others with `hidden-<id>` classes), its images, links
 * and loaded URLs, the ids anchors can point at, and text that shows a reference instead of its value.
 */
export function scanHtml(html: string): HtmlScan {
  const ranges = hiddenRanges(html);
  const stack: { tag: string; hidden: readonly string[] }[] = [];
  const meta = new Map<string, string>();
  const images: string[] = [];
  const links: string[] = [];
  const resources: string[] = [];
  const ids = new Set<string>();
  const leaks: ValueLeak[] = [];
  const headings: (readonly string[])[] = [];
  let title: string | null = null;
  let canonical: string | null = null;
  let inHead = false;

  for (const match of html.matchAll(TOKEN)) {
    const [, rawTag, rawAttributes, closing, opening, openingAttributes, text] = match;

    if (rawTag !== undefined) {
      // A script's own src is loaded; its code and a template's content are no visible text.
      const src = parseAttributes(rawAttributes ?? "").get("src");

      if (rawTag.toLowerCase() === "script" && src !== undefined) {
        resources.push(src);
      }
    } else if (closing !== undefined) {
      const tag = closing.toLowerCase();
      const index = stack.findLastIndex((entry) => entry.tag === tag);

      if (index >= 0) {
        stack.length = index;
      }

      inHead &&= tag !== "head";
    } else if (opening !== undefined) {
      const tag = opening.toLowerCase();
      const attributes = parseAttributes(openingAttributes ?? "");
      const hidden = [
        ...(stack.at(-1)?.hidden ?? []),
        ...(attributes.get("class") ?? "").split(/\s+/).filter((name) => HIDDEN_CLASS.test(name)),
      ];

      inHead = tag === "head" || (inHead && tag !== "body");
      readElement(tag, attributes);

      if (tag === "h1") {
        headings.push(hidden);
      }

      if (!VOID_TAGS.has(tag) && !(openingAttributes ?? "").trimEnd().endsWith("/")) {
        stack.push({
          tag,
          hidden,
        });
      }
    } else if (text !== undefined) {
      const decoded = decodeEntities(text);

      if (inHead && stack.at(-1)?.tag === "title") {
        title = `${title ?? ""}${decoded}`.trim();
      } else if (!inHead) {
        checkLeak("text", decoded);
      }
    }
  }

  return {
    title: title === "" ? null : title,
    meta,
    canonical,
    h1: mostAtOneWidth(headings, ranges),
    images,
    links,
    resources,
    ids,
    leaks,
  };

  function readElement(tag: string, attributes: ReadonlyMap<string, string>): void {
    const id = attributes.get("id");

    if (id !== undefined && id !== "") {
      ids.add(id);
    }

    for (const name of TEXT_ATTRIBUTES) {
      checkLeak(`${name} of <${tag}>`, attributes.get(name) ?? "");
    }

    for (const name of RESOURCE_ATTRIBUTES[tag] ?? []) {
      const value = attributes.get(name);

      if (value !== undefined) {
        resources.push(...(name === "srcset" ? srcsetUrls(value) : [value]));
      }
    }

    const rel = (attributes.get("rel") ?? "").toLowerCase().split(/\s+/);
    const href = attributes.get("href");

    switch (tag) {
      case "meta": {
        const key = (attributes.get("name") ?? attributes.get("property") ?? "").toLowerCase();
        const content = attributes.get("content");

        if (key !== "" && content !== undefined && !meta.has(key)) {
          meta.set(key, content);
          checkLeak(`meta ${key}`, content);
        }

        break;
      }
      case "link":
        canonical ??= rel.includes("canonical") ? (href ?? null) : null;

        if (href !== undefined && rel.some((value) => LOADED_LINK_RELS.has(value))) {
          resources.push(href);
        }

        break;
      case "img": {
        const src = attributes.get("src");

        if (src !== undefined && !src.startsWith("data:")) {
          images.push(src);
        }

        break;
      }
      case "a":
        if (href !== undefined) {
          links.push(href);
        }

        break;
    }
  }

  function checkLeak(where: string, value: string): void {
    const match = UNRESOLVED_VALUE.exec(value);

    if (match !== null) {
      leaks.push({
        where,
        text: quoteAround(value.replace(/\s+/g, " ").trim(), match[0]),
      });
    }
  }
}

/** Each `hidden-<id>` class of Framer's breakpoint CSS with the viewport widths it hides the element at. */
export function hiddenRanges(html: string): Map<string, WidthRange> {
  const ranges = new Map<string, WidthRange>();

  for (const [, query = "", selectors = ""] of html.matchAll(HIDDEN_RULE)) {
    const min = /min-width:\s*([\d.]+)px/.exec(query)?.[1];
    const max = /max-width:\s*([\d.]+)px/.exec(query)?.[1];

    for (const [, name] of selectors.matchAll(/\.(hidden-[\w-]+)/g)) {
      if (name !== undefined) {
        ranges.set(name, [
          min === undefined ? 0 : Number(min),
          max === undefined ? Number.POSITIVE_INFINITY : Number(max),
        ]);
      }
    }
  }

  return ranges;
}

/** Page paths from a sitemap, wherever its URLs point (a custom domain): the same pages on the site being checked. */
export function sitemapPaths(xml: string): string[] {
  const paths = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].flatMap(([, loc]) => {
    try {
      return [new URL(decodeEntities(loc ?? "")).pathname];
    } catch {
      return [];
    }
  });

  return [...new Set(paths)];
}

/**
 * The pages to fetch within `limit`: the home page and every top-level page first (the site's own pages), then the
 * pages under each path (CMS items, locales) taken in turn from each, so every collection gets checked.
 */
export function pickPages(paths: readonly string[], limit: number): string[] {
  const unique = [...new Set(paths)];
  const top = unique
    .filter((path) => path.split("/").filter(Boolean).length <= 1)
    .sort((a, b) => Number(b === "/") - Number(a === "/"));
  const groups = new Map<string, string[]>();

  for (const path of unique.filter((candidate) => !top.includes(candidate))) {
    const parent = path.replace(/\/[^/]*\/?$/, "");

    groups.set(parent, [...(groups.get(parent) ?? []), path]);
  }

  const nested: string[] = [];
  const queues = [...groups.values()];

  for (let index = 0; queues.some((queue) => index < queue.length); index += 1) {
    nested.push(...queues.flatMap((queue) => (index < queue.length ? [queue[index] ?? ""] : [])));
  }

  return [...top, ...nested].slice(0, limit);
}

/**
 * What one published page gets wrong on its own: references published instead of values, a missing title,
 * description, social image or canonical URL, h1 headings other than one, too much weight, and http resources on an
 * https page.
 */
export function pageFindings(path: string, pageUrl: string, scan: HtmlScan, htmlBytes: number): SiteFinding[] {
  const findings = scan.leaks.map(({ where, text }) =>
    liveFinding(
      "unresolved-value",
      "defect",
      path,
      `The ${where} on ${path} shows "${text}": Framer published a reference instead of its value.`,
      "A variable or CMS field is bound where Framer takes only plain text (alt text, a meta tag, a text inside a component). Write the text itself there, or pass it through a text control of the component; publish and run live_check again.",
    ),
  );
  const missing = (rule: string, severity: SiteFinding["severity"], what: string, fix: string) => {
    findings.push(liveFinding(rule, severity, path, `${path} has no ${what}.`, fix));
  };

  if (scan.title === null) {
    missing(
      "missing-title",
      "defect",
      "title",
      "Set the page's title (metadata.title), or the site's on the root node.",
    );
  }

  if ((scan.meta.get("description") ?? "") === "") {
    missing(
      "missing-description",
      "defect",
      "meta description",
      "Set metadata.description on the page, or the site's on the root node: 70–160 characters.",
    );
  }

  if ((scan.meta.get("og:image") ?? "") === "") {
    missing(
      "missing-og-image",
      "likely",
      "social image (og:image), so links shared to it show no preview",
      "Set metadata.socialImage on the root node (1200×630), or on the page.",
    );
  }

  if (scan.canonical === null) {
    missing(
      "missing-canonical",
      "likely",
      "canonical URL",
      "Framer normally writes it: check that the page is not hidden from search (metadata.noIndex) and that no custom head code removes it.",
    );
  }

  if (scan.h1 !== 1) {
    findings.push(
      liveFinding(
        "h1-count",
        "likely",
        path,
        `${path} shows ${scan.h1} h1 headings at one screen width; search engines expect one.`,
        scan.h1 === 0
          ? "Give the main headline a text style with tag h1."
          : "Keep h1 on the main headline and give the others h2.",
      ),
    );
  }

  const images = distinctImages(scan.images).length;

  if (htmlBytes > LIVE_HTML_HEAVY_BYTES || images > LIVE_IMAGES_HEAVY) {
    findings.push(
      liveFinding(
        "heavy-page",
        "likely",
        path,
        `${path} weighs ${Math.round(htmlBytes / 1000)} kB of HTML and loads ${images} images.`,
        "Split long pages, cut layers hidden on every breakpoint, and lazy-load or drop images below the fold.",
      ),
    );
  }

  const insecure = pageUrl.startsWith("https:") ? scan.resources.filter((url) => /^http:\/\//i.test(url)) : [];

  if (insecure.length > 0) {
    findings.push(
      liveFinding(
        "mixed-content",
        "defect",
        path,
        `${path} is served over https but loads ${insecure.slice(0, 3).join(", ")}${insecure.length > 3 ? ", …" : ""} over http: browsers block it or mark the page insecure.`,
        "Use the https:// address in the custom code, embed or image that loads it.",
      ),
    );
  }

  return findings;
}

/** Image URLs by file: the same file at another size (Framer's ?scale-down-to=, ?width=) is one image. */
export function distinctImages(urls: readonly string[]): string[] {
  return [...new Set(urls.map((url) => url.split("?")[0] ?? url))];
}

export function liveFinding(
  rule: string,
  severity: SiteFinding["severity"],
  page: string,
  message: string,
  fix: string,
): SiteFinding {
  return {
    rule,
    severity,
    page,
    nodeId: null,
    nodeName: null,
    message,
    fix,
  };
}

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, code: string) => {
    if (code.startsWith("#x") || code.startsWith("#X")) {
      return String.fromCodePoint(Number.parseInt(code.slice(2), 16));
    }

    if (code.startsWith("#")) {
      return String.fromCodePoint(Number(code.slice(1)));
    }

    return HTML_ENTITIES[code.toLowerCase()] ?? entity;
  });
}

function parseAttributes(source: string): Map<string, string> {
  const attributes = new Map<string, string>();

  for (const [, name, double, single, bare] of source.matchAll(ATTRIBUTE)) {
    if (name !== undefined && !attributes.has(name.toLowerCase())) {
      attributes.set(name.toLowerCase(), decodeEntities(double ?? single ?? bare ?? ""));
    }
  }

  return attributes;
}

function srcsetUrls(srcset: string): string[] {
  return srcset.split(",").flatMap((entry) => {
    const [url] = entry.trim().split(/\s+/);

    return url === undefined || url === "" ? [] : [url];
  });
}

/** The most headings visible at one viewport width, trying the start of every breakpoint range. */
function mostAtOneWidth(headings: readonly (readonly string[])[], ranges: ReadonlyMap<string, WidthRange>): number {
  if (ranges.size === 0) {
    return headings.length;
  }

  const widths = [...new Set([...ranges.values()].map(([min]) => min))];
  const hiddenAt = (width: number, classes: readonly string[]) =>
    classes.some((name) => {
      const range = ranges.get(name);

      return range !== undefined && width >= range[0] && width <= range[1];
    });

  return Math.max(...widths.map((width) => headings.filter((classes) => !hiddenAt(width, classes)).length));
}

/** The text around `found`, cut to LIVE_QUOTE_MAX. */
function quoteAround(text: string, found: string): string {
  if (text.length <= LIVE_QUOTE_MAX) {
    return text;
  }

  const start = Math.max(0, text.indexOf(found) - Math.floor((LIVE_QUOTE_MAX - found.length) / 2));

  return `${start > 0 ? "…" : ""}${text.slice(start, start + LIVE_QUOTE_MAX)}…`;
}
