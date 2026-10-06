/** The sections of Framer's template checklist that template_audit checks, in the order it reports them. */
export const TEMPLATE_SECTIONS = [
  "cms",
  "pages",
  "responsive",
  "layers",
  "text",
  "seo",
  "styles",
  "links",
  "copyright",
] as const;

/** What each section checks, so a section without findings reads as passed. */
export const TEMPLATE_SECTION_CHECKS = {
  cms: "Repeated content (posts, cases, team, testimonials) comes from CMS collections with clear names, and no collection is empty or holds -copy slugs.",
  pages: "A custom 404 page, every page on a layout template, and legal pages when the site has a form.",
  responsive:
    "Desktop, Tablet and Phone breakpoints on every page, each adapted rather than the desktop layout squeezed.",
  layers: 'Layers named by their role, none left as "Frame 12".',
  text: "Realistic copy: no lorem ipsum or placeholder text, in the pages and the CMS, and no past copyright year.",
  seo: "Titles and descriptions, a favicon and a social image, one h1 per page, no page hidden from search, alt text on photos.",
  styles: "Text styles and color tokens instead of values written on one layer.",
  links: "No dead links: pages, anchors, mailto and tel.",
  copyright: "No real companies' logos: a template may not show them without permission.",
} as const;

/** What the audit cannot see: the creator checks these by hand before listing the template. */
export const TEMPLATE_MANUAL_CHECKS = [
  "Read every page for spelling and grammar.",
  "Everything clickable looks clickable and has hover and pressed states.",
  "In Preview, resize slowly between the breakpoints: no horizontal scroll, nothing cut, components adapt too.",
  "Run Framer's performance checks: images at about twice their shown size, videos short, muted and with a poster.",
  "Every photo, icon and font is original or licensed; fonts come from Framer's library.",
  "Each form sends its submissions somewhere and shows its success and error states.",
  "Publish, then run live_check on the published site.",
  "Remix the template into a clean account and check that it works as a starting point.",
  "The listing: images of the real template, the preview and remix links, and the Framer plan it needs.",
] as const;

/** Framer's names for a layer nobody named: "Frame", "Stack 3", "Image 12", "Variant 1". */
export const DEFAULT_LAYER_NAME =
  /^(?:(?:Frame|Stack|Rectangle|Ellipse|Group|Graphic|Vector|Polygon|Star|Path)(?: \d+)?|(?:Image|Text|Video|Grid|Variant|Component|Line|SVG) \d+)$/;

/** Placeholder copy a buyer would have to find and replace. */
export const PLACEHOLDER_TEXT =
  /\blorem\b|\bdolor sit amet\b|\bconsectetur adipiscing\b|\byour (?:text|title|heading|name|company|tagline) here\b|\b(?:placeholder|sample|dummy) text\b|\btext goes here\b/i;

/** A copyright line and its (last) year: "© 2024", "(c) 2021–2024", "Copyright 2023". */
export const COPYRIGHT_YEAR = /(?:©|\(c\)|copyright)\s*(?:\d{4}\s*[-–]\s*)?(\d{4})\b/i;

/** Pages and CMS collections that hold the legal texts a form needs. */
export const LEGAL_WORDS = /privacy|terms|legal|imprint|impressum|cookie|polic(?:y|ies)|gdpr|disclaimer/i;

/** A CMS slug Framer made by duplicating an item. */
export const COPY_SLUG = /-copy(?:-\d+)?$/;

/** A CMS collection still under the name Framer gave it. */
export const UNCLEAR_COLLECTION_NAME = /^(?:collection|untitled|new collection)(?: \d+)?$/i;

/** Layers whose children are a row of client or partner logos. */
export const LOGO_CONTEXT = /logo|client|partner|brand|trusted|customer|press|featured|backed|investor|sponsor/i;

/** Words a logo layer's name carries besides the company: "Google Logo", "logo-stripe.svg". */
export const LOGO_NAME_NOISE = /\b(?:logo|logotype|wordmark|icon|mark|svg|png|webp|jpe?g)\b/g;

/**
 * Companies whose logos templates show as fake clients. Social networks are left out: an icon that links to the
 * buyer's own profile is not a claim of a client.
 */
export const BRAND_NAMES: ReadonlySet<string> = new Set([
  "accenture",
  "adobe",
  "airbnb",
  "amazon",
  "apple",
  "asana",
  "atlassian",
  "audi",
  "bmw",
  "calendly",
  "canva",
  "cisco",
  "clickup",
  "coca cola",
  "coinbase",
  "datadog",
  "deloitte",
  "disney",
  "doordash",
  "dropbox",
  "figma",
  "ford",
  "google",
  "hubspot",
  "ibm",
  "intel",
  "intercom",
  "linear",
  "loom",
  "lyft",
  "mailchimp",
  "mastercard",
  "mckinsey",
  "mercedes",
  "mercedes benz",
  "microsoft",
  "miro",
  "monday",
  "mongodb",
  "netflix",
  "nike",
  "notion",
  "nvidia",
  "openai",
  "oracle",
  "paypal",
  "pepsi",
  "revolut",
  "salesforce",
  "samsung",
  "shopify",
  "slack",
  "snowflake",
  "sony",
  "spotify",
  "squarespace",
  "starbucks",
  "stripe",
  "tesla",
  "toyota",
  "trello",
  "twilio",
  "uber",
  "vercel",
  "visa",
  "webflow",
  "wix",
  "zapier",
  "zoom",
]);

/** How deep two frames are compared to tell they were built alike: card > media/body > text. */
export const SHAPE_DEPTH = 3;

/** Layers a folded finding names before "…". */
export const FOLD_NAMES_MAX = 5;

/** How much of a text a finding quotes. */
export const QUOTE_MAX = 60;
