/** The Framer Marketplace. Its item pages render their data into the HTML. */
export const MARKETPLACE_URL = "https://www.framer.com/marketplace";

/** Framer answers a bare client with a redirect page; a browser's user agent gets the page. */
export const MARKETPLACE_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36";

export const MARKETPLACE_TIMEOUT_MS = 15_000;

/** Next.js streams the page's data as JSON strings inside these script calls. */
export const FLIGHT_CHUNK = /self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)/g;

/** A Marketplace item page: https://www.framer.com/marketplace/components/<slug>/ (or templates). */
export const ITEM_PAGE = /^https?:\/\/(?:www\.)?framer\.com\/marketplace\/(components|templates)\/([a-z0-9-]+)\/?/;

/** Where the item of a detail page starts in the decoded data. */
export const ITEM_RESOURCE = '"resource":{"id":"';

/** At most this many item pages per call, and this much of an item's description. */
export const MARKETPLACE_ITEMS_MAX = 5;
export const ITEM_DESCRIPTION_MAX = 1500;

/** The temporary design page a component is inserted on to read its controls, then deleted. */
/** The temporary web page inspect places a component on, with a random suffix. */
export const INSPECT_PAGE_PATH = "/sitewright-check";

export const CONTROL_PREFIX = "$control__";
