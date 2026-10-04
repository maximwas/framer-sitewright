import type { SupportLink } from "../types/product.ts";

/**
 * How the tool presents itself, in one place. The name has no "Framer" in it (Framer's trademark rules); texts say
 * "for Framer" and that it is unofficial.
 */
export const PRODUCT = {
  /** The npm package and the command people run. */
  packageName: "sitewright",
  /** The name in texts for people. */
  title: "Sitewright",
  /** The Framer plugin's name in the marketplace and in messages to the user. */
  pluginTitle: "Sitewright",
} as const;

/** Where people can support the project. Empty until the services are chosen; every support button hides then. */
export const SUPPORT_LINKS: readonly SupportLink[] = [];
