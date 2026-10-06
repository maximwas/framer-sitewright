/** The Framer Marketplace. Category pages and the listings render their items into the HTML; search pages do not. */
export const MARKETPLACE_URL = "https://www.framer.com/marketplace";

export const MARKETPLACE_KINDS = ["templates", "components"] as const;

/** Framer answers a bare client with a redirect page; a browser's user agent gets the listing. */
export const MARKETPLACE_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36";

export const MARKETPLACE_TIMEOUT_MS = 15_000;

export const MARKETPLACE_LIMIT = 12;
export const MARKETPLACE_LIMIT_MAX = 40;

/** Next.js streams the page's data as JSON strings inside these script calls. */
export const FLIGHT_CHUNK = /self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)/g;

/** Where a Marketplace item's object starts in the decoded data. */
export const ITEM_START = /\{"id":"[A-Za-z0-9]+","title":"/g;

/** Links to the categories of a listing. */
export const CATEGORY_LINK = /\/marketplace\/(templates|components)\/categories\/([a-z0-9-]+)\//g;

/** A Marketplace item page: https://www.framer.com/marketplace/components/<slug>/ (or templates). */
export const ITEM_PAGE = /^https?:\/\/(?:www\.)?framer\.com\/marketplace\/(components|templates)\/([a-z0-9-]+)\/?/;

/** Where the item of a detail page starts in the decoded data. */
export const ITEM_RESOURCE = '"resource":{"id":"';

/** At most this many item pages per call, and this much of an item's description. */
export const MARKETPLACE_ITEMS_MAX = 5;
export const ITEM_DESCRIPTION_MAX = 1500;

/** The temporary design page a component is inserted on to read its controls, then deleted. */
export const INSPECT_PAGE_NAME = "Sitewright component check";
