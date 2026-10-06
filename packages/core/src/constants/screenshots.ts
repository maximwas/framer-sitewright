/** The readProject query that captures a node, a page or a public URL. */
export const SCREENSHOT_QUERY_TYPE = "screenshot";

/** The browser window Framer opens a URL in by default; the capture is the whole page at this width. */
export const DEFAULT_VIEWPORT = {
  width: 1200,
  height: 1080,
} as const;

/** A viewport narrower than this is a phone, and gets a phone's height (844, an iPhone's) unless one is given. */
export const PHONE_MAX_WIDTH = 600;
export const PHONE_VIEWPORT_HEIGHT = 844;

/** Viewport sizes a call may ask for, in CSS px. */
export const VIEWPORT_WIDTH_RANGE = [320, 2560] as const;
export const VIEWPORT_HEIGHT_RANGE = [480, 2160] as const;

/** An http(s) URL's host (an IPv6 one in brackets), past any user info. */
export const WEB_URL_HOST = /^https?:\/\/(?:[^@/?#]*@)?(\[[^\]/?#]*\]|[^/:?#]+)(?::\d+)?(?:[/?#]|$)/i;

/**
 * Hosts Framer's screenshot service cannot reach: this machine, private networks and names without a public domain.
 * Framer blocks them anyway; refusing first says why.
 */
export const PRIVATE_HOSTS: readonly RegExp[] = [
  /^localhost$/,
  /\.(localhost|local|internal|lan|home\.arpa)$/,
  /^[^.:]+$/,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./,
  /^0\./,
  /^::1?$/,
  /^f[cd][0-9a-f]{2}:/,
  /^fe80:/,
];
