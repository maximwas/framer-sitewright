/** The site's root node: its metadata is the default every page inherits. Framer gives it this id in every project. */
export const ROOT_NODE_ID = "rootNode";

/** Settings writes and reads go to this page: Framer finds the root and every page by id from it (06.10.2026). */
export const SETTINGS_PAGE_PATH = "/";

/** The node types one getNodesOfTypes call reads the settings from. */
export const SETTINGS_NODE_TYPES = ["RootNode", "WebPageNode", "LayoutTemplateNode"] as const;

/** Site settings and the root node's DSL attributes. Favicons exist only here, not on pages. */
export const SITE_SETTING_ATTRIBUTES = {
  title: "metadata.title",
  description: "metadata.description",
  socialImage: "metadata.socialImage",
  favicon: "metadata.favicon",
  faviconDark: "metadata.faviconDark",
  appleTouchIcon: "metadata.appleTouchIcon",
} as const;

/** Page settings and the web page's DSL attributes, in the order a SET writes them. noIndex exists only on pages. */
export const PAGE_SETTING_ATTRIBUTES = {
  title: "metadata.title",
  description: "metadata.description",
  socialImage: "metadata.socialImage",
  noIndex: "metadata.noIndex",
  noIndexSite: "metadata.noIndexSite",
  layoutTemplate: "layoutTemplate",
  draft: "draft",
} as const;

/** A page's layoutTemplate when it has none set: it takes the home page's template. */
export const DEFAULT_LAYOUT_TEMPLATE = "default";

/** An image Framer downloads itself for a setting: an https URL (it stores a copy on framerusercontent.com). */
export const SETTINGS_IMAGE_URL = /^https:\/\/\S+$/;

/** A CMS detail page's social image may come from a field of its item: a variable reference. */
export const SETTINGS_VARIABLE_REFERENCE = /^var\(--variable-[\w-]+\)$/;

/** What site_settings_get cannot see through the Plugin API. */
export const SETTINGS_NO_KEY_NOTE =
  "Read through the Plugin API (no Server API key): only each page's path and draft state are visible. Titles, descriptions, images, search settings and layout templates need the project's Server API key.";
