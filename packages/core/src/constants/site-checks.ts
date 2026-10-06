/** Page titles search engines show in full: shorter reads thin, longer is cut. */
export const SEO_TITLE_RANGE = [30, 60] as const;

/** Meta descriptions shown in full in search results. */
export const SEO_DESCRIPTION_RANGE = [70, 160] as const;

/** WCAG 2 contrast minimums: normal text AA, large text AA, normal text AAA. */
export const CONTRAST_AA = 4.5;
export const CONTRAST_AA_LARGE = 3;
export const CONTRAST_AAA = 7;

/** Text at this size and above counts as large for WCAG (24px, or about 18.7px bold). */
export const LARGE_TEXT_PX = 24;

/** How deep the site checks read each page: as deep as the layout audit. */
export const SITE_CHECK_DEPTH = 8;

/** Link schemes and shapes, in the order they are tried. */
export const LINK_KINDS = ["variable", "mail", "phone", "external", "anchor", "page", "other"] as const;

/** Paths of pages that carry their own rules: the 404 page may be hidden from search. */
export const NOT_FOUND_PATH = "/404";

/** A plain e-mail address after mailto:, before any ?subject=. */
export const MAILTO_ADDRESS = /^[^\s@?]+@[^\s@?]+\.[^\s@?]+$/;

/** A phone number after tel:: digits with an optional +, spaces, dots, dashes and brackets. */
export const TEL_NUMBER = /^\+?[\d\s().-]{6,}$/;

/** An image uploaded to Framer, by its file id: the same file is the same photo wherever it is used. */
export const FRAMER_IMAGE_ID = /framerusercontent\.com\/(?:images|assets)\/([A-Za-z0-9]+)/;

/** An Unsplash photo id in a URL. */
export const UNSPLASH_PHOTO_ID = /images\.unsplash\.com\/(?:photo-)?([\w-]+?)(?:\?|$)/;
