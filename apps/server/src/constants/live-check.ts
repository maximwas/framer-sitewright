/** Pages live_check fetches by default and at most: every top-level page, then CMS pages taken evenly per collection. */
export const LIVE_PAGES_DEFAULT = 20;
export const LIVE_PAGES_MAX = 50;

/** Images and internal links it requests at most, each once however many pages show it. */
export const LIVE_IMAGES_MAX = 120;
export const LIVE_LINKS_MAX = 120;

/** How long one request may take, and how many run at once (a published site is a CDN; stay polite anyway). */
export const LIVE_TIMEOUT_MS = 12_000;
export const LIVE_CONCURRENCY = 6;

/** Past these a page is heavy: its HTML (Framer inlines styles and every breakpoint's copy) and its distinct images. */
export const LIVE_HTML_HEAVY_BYTES = 1_000_000;
export const LIVE_IMAGES_HEAVY = 60;

/** A request that says who asks; Framer serves visitors and bots the same HTML. */
export const LIVE_USER_AGENT = "Mozilla/5.0 (compatible; Sitewright live_check)";

/** A reference Framer published instead of its value: a CSS variable or a template placeholder. */
export const UNRESOLVED_VALUE = /var\(--[\w-]*\)?|\{\{[^}]*\}?\}?/;

/** How much text around an unresolved value a finding quotes. */
export const LIVE_QUOTE_MAX = 80;

/** Elements whose content is no visible text. */
export const RAW_TEXT_TAGS = ["script", "style", "template", "noscript"] as const;

/** Elements without a closing tag. */
export const VOID_TAGS: ReadonlySet<string> = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

/** Attributes whose text a visitor or a screen reader gets. */
export const TEXT_ATTRIBUTES = ["alt", "title", "aria-label", "placeholder"] as const;

/** link rel values that make the browser load the URL: the rest (canonical, alternate) only name it. */
export const LOADED_LINK_RELS: ReadonlySet<string> = new Set([
  "stylesheet",
  "preload",
  "modulepreload",
  "icon",
  "apple-touch-icon",
  "manifest",
]);

/** Elements and the attributes they load a URL from, for mixed content. */
export const RESOURCE_ATTRIBUTES: Readonly<Record<string, readonly string[]>> = {
  img: ["src", "srcset"],
  source: ["src", "srcset"],
  script: ["src"],
  iframe: ["src"],
  video: ["src", "poster"],
  audio: ["src"],
  embed: ["src"],
  object: ["data"],
};

/** A rule of Framer's breakpoint CSS: `@media (min-width: 810px) and (max-width: 1199.98px){.hidden-abc{display:none…`. */
export const HIDDEN_RULE = /@media\s*([^{]+)\{\s*([^{}]+)\{\s*display\s*:\s*none/g;

/** A class that hides an element on one breakpoint. */
export const HIDDEN_CLASS = /^hidden-[\w-]+$/;

/** Named HTML entities that Framer's text uses. */
export const HTML_ENTITIES: Readonly<Record<string, string>> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  copy: "©",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
};
