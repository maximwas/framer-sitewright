import {
  bySeverity,
  countOf,
  OperationError,
  projectOverview,
  publishStatus,
  type SiteFinding,
} from "@sitewright/core";
import {
  LIVE_CONCURRENCY,
  LIVE_IMAGES_MAX,
  LIVE_LINKS_MAX,
  LIVE_TIMEOUT_MS,
  LIVE_USER_AGENT,
} from "../constants/live-check.ts";
import type { TransportRouter } from "../transports/router.ts";
import type {
  HtmlScan,
  LiveCheckDeps,
  LiveCheckInput,
  LiveCheckOutput,
  LivePage,
  PublishedSite,
} from "../types/live-check.ts";
import { distinctImages, liveFinding, pageFindings, pickPages, scanHtml, sitemapPaths } from "../utils/live-check.ts";

/** A page as fetched: its answer, and what its HTML holds when it answered with one. */
interface FetchedPage {
  readonly path: string;
  readonly url: string;
  readonly status: number | null;
  readonly bytes: number;
  readonly scan: HtmlScan | null;
}

/** A URL several pages share (an image, a link target), checked once, with the pages that use it. */
interface SharedUrl {
  readonly url: string;
  readonly pages: string[];
}

/**
 * Reads the published site as visitors get it and finds what the editor cannot show: references published instead of
 * values, broken images and links, missing metadata, h1 headings, weight and mixed content. Only public URLs are
 * read; nothing is published.
 */
export async function liveCheck({ url, limit }: LiveCheckInput, deps: LiveCheckDeps): Promise<LiveCheckOutput> {
  const project = url === undefined ? await deps.site() : null;
  const start = url ?? project?.url;

  if (start === undefined) {
    throw new OperationError(
      "NOT_FOUND",
      "The connected project is not published yet, so there is no live site to check.",
      "Publish it with project_publish when the user asks, or pass url to check another published site.",
    );
  }

  const base = new URL(start);
  const sitemap = await fetchText(deps, new URL("/sitemap.xml", base.origin).href);
  const listed = sitemap === null ? [] : sitemapPaths(sitemap);
  const all = listed.length > 0 ? listed : (project?.paths ?? [base.pathname]);
  const paths = pickPages(base.pathname === "/" ? all : [base.pathname, ...all], limit);
  const pages = await inTurns(paths, (path) => fetchPage(deps, path, new URL(path, base.origin).href));
  const byPath = new Map(pages.map((page) => [page.path, page]));
  const findings: SiteFinding[] = pages.flatMap((page) => {
    if (page.status === null) {
      return [
        liveFinding(
          "page-unreachable",
          "likely",
          page.path,
          `${page.path} did not answer within ${LIVE_TIMEOUT_MS / 1000} s.`,
          "Open it in a browser; run live_check again once it loads.",
        ),
      ];
    }

    if (page.status >= 400 || page.scan === null) {
      return [
        liveFinding(
          "page-error",
          "defect",
          page.path,
          `${page.path} answers ${page.status}.`,
          "Publish the page, or remove it from the sitemap by deleting or hiding it.",
        ),
      ];
    }

    return pageFindings(page.path, page.url, page.scan, page.bytes);
  });
  const images = sharedImages(pages);
  const targets = linkTargets(pages, byPath, findings);
  const [imageStatus, linkStatus] = await Promise.all([
    inTurns(images.slice(0, LIVE_IMAGES_MAX), async (image) => statusOf(deps, image.url)),
    inTurns(targets.slice(0, LIVE_LINKS_MAX), async (target) => statusOf(deps, target.url)),
  ]);

  images.slice(0, LIVE_IMAGES_MAX).forEach((image, index) => {
    const status = imageStatus[index] ?? null;

    if (status !== null && status >= 400) {
      findings.push(
        liveFinding(
          "broken-image",
          "defect",
          image.pages[0] ?? "/",
          `${image.url} answers ${status}; it is on ${image.pages.join(", ")}.`,
          "Upload the image again (image_upload) and set it on the layer, or remove the layer.",
        ),
      );
    }
  });
  targets.slice(0, LIVE_LINKS_MAX).forEach((target, index) => {
    const status = linkStatus[index] ?? null;

    if (status !== null && status >= 400) {
      findings.push(
        liveFinding(
          "broken-link",
          "defect",
          target.pages[0] ?? "/",
          `${new URL(target.url).pathname} answers ${status}; it is linked from ${target.pages.join(", ")}.`,
          "Link to a published page (links_check lists them in the editor), or add a redirect with redirects_set.",
        ),
      );
    }
  });

  const unknown = [...imageStatus, ...linkStatus].filter((status) => status === null).length;
  const sorted = bySeverity(findings);

  return {
    site: base.origin + (base.pathname === "/" ? "/" : base.pathname),
    publishedAt: project?.publishedAt ?? null,
    pages: pages.map(pageSummary),
    findings: sorted,
    summary:
      sorted.length === 0
        ? `${countOf(pages.length, "page")}; nothing found.`
        : `${countOf(pages.length, "page")}; ${countOf(sorted.length, "finding")}, ${countOf(sorted.filter(({ severity }) => severity === "defect").length, "defect")}.`,
    note: noteOf({
      project,
      listed: listed.length,
      total: new Set(all).size,
      checked: pages.length,
      limit,
      images: images.length,
      targets: targets.length,
      unknown,
    }),
  };
}

/** The connected project's published site: production, else staging, with its pages and the changes since. */
export async function publishedSite(transports: TransportRouter): Promise<PublishedSite | null> {
  const status = await transports.run(publishStatus, {});
  const live = status.production ?? status.staging;

  if (live === null) {
    return null;
  }

  const overview = await transports.run(projectOverview, {}).catch(() => null);

  return {
    url: live.url,
    publishedAt: live.publishedAt,
    changedSince: status.unpublished?.length ?? null,
    paths: (overview?.pages ?? []).flatMap(({ path, draft }) =>
      path === null || draft || path.includes(":") ? [] : [path],
    ),
  };
}

const HEADERS = {
  "user-agent": LIVE_USER_AGENT,
  accept: "text/html,application/xhtml+xml,*/*",
};

async function fetchPage(deps: LiveCheckDeps, path: string, url: string): Promise<FetchedPage> {
  try {
    const response = await deps.fetch(url, {
      method: "GET",
      headers: HEADERS,
      redirect: "follow",
      signal: AbortSignal.timeout(LIVE_TIMEOUT_MS),
    });
    const html = response.ok ? await response.text() : null;

    if (html === null) {
      await response.body?.cancel();
    }

    return {
      path,
      url,
      status: response.status,
      bytes: html === null ? 0 : Buffer.byteLength(html),
      scan: html === null ? null : scanHtml(html),
    };
  } catch {
    return {
      path,
      url,
      status: null,
      bytes: 0,
      scan: null,
    };
  }
}

async function fetchText(deps: LiveCheckDeps, url: string): Promise<string | null> {
  try {
    const response = await deps.fetch(url, {
      method: "GET",
      headers: HEADERS,
      redirect: "follow",
      signal: AbortSignal.timeout(LIVE_TIMEOUT_MS),
    });

    return response.ok ? await response.text() : null;
  } catch {
    return null;
  }
}

/** A URL's status: HEAD, or GET when the server refuses HEAD; null when it did not answer. */
async function statusOf(deps: LiveCheckDeps, url: string): Promise<number | null> {
  const request = async (method: "HEAD" | "GET") => {
    const response = await deps.fetch(url, {
      method,
      headers: HEADERS,
      redirect: "follow",
      signal: AbortSignal.timeout(LIVE_TIMEOUT_MS),
    });

    await response.body?.cancel();

    return response.status;
  };

  try {
    const head = await request("HEAD");

    return head === 403 || head === 405 || head === 501 ? await request("GET") : head;
  } catch {
    return null;
  }
}

/** Every image file the pages load, social images included, each once with the pages that show it. */
function sharedImages(pages: readonly FetchedPage[]): SharedUrl[] {
  const byFile = new Map<string, SharedUrl>();

  for (const page of pages) {
    const scan = page.scan;
    const sources = scan === null ? [] : [...scan.images, scan.meta.get("og:image"), scan.meta.get("twitter:image")];

    for (const source of sources) {
      const url = resolve(source, page.url);

      if (url === null) {
        continue;
      }

      const key = distinctImages([url])[0] ?? url;
      const shared = byFile.get(key) ?? {
        url,
        pages: [],
      };

      if (!shared.pages.includes(page.path)) {
        shared.pages.push(page.path);
      }

      byFile.set(key, shared);
    }
  }

  return [...byFile.values()];
}

/**
 * Internal links to pages not fetched here, each once with the pages that link to it; anchors to pages that were
 * fetched are checked against their ids at once, into `findings`.
 */
function linkTargets(
  pages: readonly FetchedPage[],
  byPath: ReadonlyMap<string, FetchedPage>,
  findings: SiteFinding[],
): SharedUrl[] {
  const targets = new Map<string, SharedUrl>();
  const anchors = new Set<string>();

  for (const page of pages) {
    for (const href of page.scan?.links ?? []) {
      const url = resolve(href, page.url);
      const link = url === null ? null : new URL(url);

      if (link === null || link.origin !== new URL(page.url).origin) {
        continue;
      }

      const fetched = byPath.get(link.pathname);
      const hash = decodeURIComponent(link.hash.slice(1));

      if (fetched === undefined) {
        const key = link.pathname;
        const target = targets.get(key) ?? {
          url: `${link.origin}${link.pathname}`,
          pages: [],
        };

        if (!target.pages.includes(page.path)) {
          target.pages.push(page.path);
        }

        targets.set(key, target);
      } else if (
        hash !== "" &&
        fetched.scan !== null &&
        !fetched.scan.ids.has(hash) &&
        !anchors.has(`${page.path}${href}`)
      ) {
        anchors.add(`${page.path}${href}`);
        findings.push(
          liveFinding(
            "missing-anchor",
            "defect",
            page.path,
            `${href} on ${page.path} scrolls to #${hash}, but nothing on ${fetched.path} has that id.`,
            `Give the target section elementId="${hash}" in the editor, or fix the link.`,
          ),
        );
      }
    }
  }

  return [...targets.values()];
}

function resolve(href: string | undefined, base: string): string | null {
  if (href === undefined || href === "") {
    return null;
  }

  try {
    const url = new URL(href, base);

    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

function pageSummary(page: FetchedPage): LivePage {
  return {
    path: page.path,
    status: page.status,
    htmlBytes: page.bytes,
    images: page.scan === null ? 0 : distinctImages(page.scan.images).length,
    title: page.scan?.title ?? null,
  };
}

function noteOf(facts: {
  project: PublishedSite | null;
  listed: number;
  total: number;
  checked: number;
  limit: number;
  images: number;
  targets: number;
  unknown: number;
}): string | null {
  const { project, listed, total, checked, limit, images, targets, unknown } = facts;
  const parts = [
    listed === 0 ? "The site has no sitemap.xml, so the pages came from the project (or the URL given)." : null,
    total > checked ? `${checked} of ${total} pages checked (limit ${limit}); raise limit to check more.` : null,
    images > LIVE_IMAGES_MAX ? `${LIVE_IMAGES_MAX} of ${images} images checked.` : null,
    targets > LIVE_LINKS_MAX ? `${LIVE_LINKS_MAX} of ${targets} link targets checked.` : null,
    unknown > 0
      ? `${countOf(unknown, "request")} did not answer in time and ${unknown === 1 ? "was" : "were"} left out.`
      : null,
    project !== null && (project.changedSince ?? 0) > 0
      ? `${countOf(project.changedSince ?? 0, "page")} changed in the editor since the publish of ${project.publishedAt.slice(0, 10)}: the live site does not show those changes yet.`
      : null,
  ].filter((part) => part !== null);

  return parts.length === 0 ? null : parts.join(" ");
}

/** Runs `task` over `items`, LIVE_CONCURRENCY at a time, keeping their order. */
async function inTurns<T, R>(items: readonly T[], task: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];

  for (let start = 0; start < items.length; start += LIVE_CONCURRENCY) {
    results.push(...(await Promise.all(items.slice(start, start + LIVE_CONCURRENCY).map(task))));
  }

  return results;
}
