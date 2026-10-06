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
