import type * as z from "zod";
import type { LiveCheckInputSchema, LiveCheckOutputSchema, LivePageSchema } from "../schemas/live-check.ts";

export type LiveCheckInput = z.output<typeof LiveCheckInputSchema>;

export type LiveCheckOutput = z.output<typeof LiveCheckOutputSchema>;

export type LivePage = z.output<typeof LivePageSchema>;

/** A viewport width range in px, from Framer's breakpoint CSS. */
export type WidthRange = readonly [min: number, max: number];

/** Text a visitor gets that holds an unresolved value, and where it sits ("text", "alt of <img>", "meta og:title"). */
export interface ValueLeak {
  readonly where: string;
  readonly text: string;
}

/** What the checks need from a page's HTML. URLs are as written: relative ones resolve against the page. */
export interface HtmlScan {
  readonly title: string | null;
  /** Meta tags' content by name or property, lowercased (description, og:image). */
  readonly meta: ReadonlyMap<string, string>;
  readonly canonical: string | null;
  /** The most h1 headings shown at one viewport width: Framer renders each breakpoint's own copy and hides the others. */
  readonly h1: number;
  readonly images: readonly string[];
  readonly links: readonly string[];
  /** URLs the browser loads (images, scripts, styles, frames), for mixed content. */
  readonly resources: readonly string[];
  readonly ids: ReadonlySet<string>;
  readonly leaks: readonly ValueLeak[];
}

/** The connected project's published site, as publish_status and project_overview tell it. */
export interface PublishedSite {
  readonly url: string;
  readonly publishedAt: string;
  /** Web pages changed in the editor since that publish; null where Framer does not tell. */
  readonly changedSince: number | null;
  /** The project's published web page paths, for a site without a sitemap. */
  readonly paths: readonly string[];
}

/** What live_check reaches the network and the project through, so tests can stand in for both. */
export interface LiveCheckDeps {
  readonly fetch: (url: string, init: RequestInit) => Promise<Response>;
  /** The connected project's published site, or null when it was never published. */
  readonly site: () => Promise<PublishedSite | null>;
}
