import { describe, expect, it } from "vitest";
import { liveCheck } from "../src/live-check/check.ts";
import type { LiveCheckDeps, PublishedSite } from "../src/types/live-check.ts";
import { pickPages, scanHtml } from "../src/utils/live-check.ts";

const SITE = "https://north.framer.app";

/** Framer's breakpoint CSS: each breakpoint's own copy of a section is hidden at the other widths. */
const BREAKPOINT_CSS =
  "<style>@media(min-width: 1200px){.hidden-desk{display:none!important}}@media(max-width: 1199.98px){.hidden-phone{display:none!important}}</style>";

const HOME = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<title>Studio North | Architecture for small towns</title>
<meta name="description" content="Houses for small towns, drawn with the people who live there.">
<meta property="og:image" content="https://cdn.test/og.jpg">
<link rel="canonical" href="${SITE}/">
${BREAKPOINT_CSS}
<script src="http://cdn.test/tracker.js"></script>
</head><body>
<div class="ssr-variant hidden-phone"><h1 class="framer-text">Houses for small towns</h1></div>
<div class="ssr-variant hidden-desk"><h1 class="framer-text">Houses for small towns</h1></div>
<img src="https://cdn.test/hero.jpg?width=800&amp;height=600" alt="A timber house at dusk">
<img src="https://cdn.test/gone.jpg" alt="var(--variable-c1b2)">
<p class="framer-text">Built for {{town}} and the people in it</p>
<a href="./about">About</a><a href="./missing">Old page</a><a href="./#work">Work</a><a href="./#nowhere">Nowhere</a>
<section id="work"></section>
<script>window.copy = "var(--not-text)"</script>
</body></html>`;

const ABOUT = `<html><head><title>About Studio North | Architects in Yorkshire</title>
<meta name="description" content="Three architects who draw houses with the towns they stand in."></head><body>
<h1>About</h1><h1>Team</h1>
<img src="https://cdn.test/hero.jpg?width=400" alt="A timber house at dusk">
<img src="https://cdn.test/gone.jpg" alt="An empty plot">
</body></html>`;

const POST = (slug: string) => `<html><head><title>A visit to ${slug} | Studio North journal</title>
<meta name="description" content="Notes from a site visit."><meta property="og:image" content="https://cdn.test/og.jpg">
<link rel="canonical" href="${SITE}/blog/${slug}"></head><body><h1>A visit to ${slug}</h1></body></html>`;

const SITEMAP = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url><loc>https://north.studio/</loc></url><url><loc>https://north.studio/blog/a</loc></url>
<url><loc>https://north.studio/blog/b</loc></url><url><loc>https://north.studio/about</loc></url></urlset>`;

function fakeFetch(routes: Record<string, string>) {
  const calls: string[] = [];
  const fetch: LiveCheckDeps["fetch"] = async (url, init) => {
    calls.push(`${init.method ?? "GET"} ${url}`);

    const body = routes[url];

    return body === undefined ? new Response("Not found", { status: 404 }) : new Response(body, { status: 200 });
  };

  return {
    fetch,
    calls,
  };
}

const published: PublishedSite = {
  url: `${SITE}/`,
  publishedAt: "2026-10-01T10:00:00.000Z",
  changedSince: 2,
  paths: ["/", "/about"],
};

describe("live_check", () => {
  it("reads a Framer page: one h1 per breakpoint copy, values published as references, URLs and metadata", () => {
    const scan = scanHtml(HOME);

    expect(scan.h1).toBe(1);
    expect(scanHtml(ABOUT).h1).toBe(2);
    expect(scan.title).toBe("Studio North | Architecture for small towns");
    expect(scan.meta.get("og:image")).toBe("https://cdn.test/og.jpg");
    expect(scan.leaks).toEqual([
      {
        where: "alt of <img>",
        text: "var(--variable-c1b2)",
      },
      {
        where: "text",
        text: "Built for {{town}} and the people in it",
      },
    ]);
    expect(scan.images).toEqual(["https://cdn.test/hero.jpg?width=800&height=600", "https://cdn.test/gone.jpg"]);
    expect(scan.resources).toContain("http://cdn.test/tracker.js");
  });

  it("takes every top-level page first, then CMS pages evenly from each collection", () => {
    expect(pickPages(["/blog/a", "/blog/b", "/blog/c", "/work/x", "/work/y", "/about", "/"], 5)).toEqual([
      "/",
      "/about",
      "/blog/a",
      "/work/x",
      "/blog/b",
    ]);
  });

  it("checks the published pages of the sitemap, each image and link once, and says what the editor has not published", async () => {
    const { fetch, calls } = fakeFetch({
      [`${SITE}/sitemap.xml`]: SITEMAP,
      [`${SITE}/`]: HOME,
      [`${SITE}/about`]: ABOUT,
      [`${SITE}/blog/a`]: POST("a"),
      [`${SITE}/blog/b`]: POST("b"),
      "https://cdn.test/og.jpg": "",
      "https://cdn.test/hero.jpg?width=800&height=600": "",
    });
    const result = await liveCheck(
      { limit: 3 },
      {
        fetch,
        site: async () => published,
      },
    );

    expect(result.site).toBe(`${SITE}/`);
    expect(result.pages.map(({ path, status }) => `${path} ${status}`)).toEqual(["/ 200", "/about 200", "/blog/a 200"]);
    expect(result.findings.map(({ rule, page }) => `${rule} ${page}`).sort()).toEqual([
      "broken-image /",
      "broken-link /",
      "h1-count /about",
      "missing-anchor /",
      "missing-canonical /about",
      "missing-og-image /about",
      "mixed-content /",
      "unresolved-value /",
      "unresolved-value /",
    ]);
    expect(result.findings.find(({ rule }) => rule === "broken-image")?.message).toMatch(/gone\.jpg.*404.*\/about/);
    expect(result.findings.every(({ fix }) => fix.length > 0)).toBe(true);
    // One request per image file, however many pages and sizes show it; none for the page's own links already fetched.
    expect(calls.filter((call) => call.includes("hero.jpg"))).toHaveLength(1);
    expect(calls.filter((call) => call.endsWith(`${SITE}/about`))).toHaveLength(1);
    expect(result.note).toMatch(/3 of 4 pages/);
    expect(result.note).toMatch(/2 pages changed/);
  });

  it("asks for a URL when the connected project was never published", async () => {
    const { fetch } = fakeFetch({});

    await expect(
      liveCheck(
        { limit: 20 },
        {
          fetch,
          site: async () => null,
        },
      ),
    ).rejects.toThrow(/not published/);
  });
});
