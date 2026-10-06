import {
  DEFAULT_LAYOUT_TEMPLATE,
  PAGE_SETTING_ATTRIBUTES,
  ROOT_NODE_ID,
  SITE_SETTING_ATTRIBUTES,
} from "../constants/site-settings.ts";
import { setNode } from "../dsl/commands.ts";
import { pageMeta } from "../site-checks/seo.ts";
import type { DslAttributes, SerializedNode } from "../types/dsl.ts";
import type {
  PageNodeSettings,
  PageSettingsInput,
  SettingsNodes,
  SiteMetadata,
  SiteSettingsInput,
} from "../types/site-settings.ts";

/** The settings among serialized RootNode, WebPageNode and LayoutTemplateNode nodes. */
export function settingsOf(nodes: readonly SerializedNode[]): SettingsNodes {
  const root = nodes.find((node) => node.type === "RootNode");

  return {
    site: siteMetadataOf(root?.attributes ?? {}),
    pages: new Map(
      nodes.flatMap((node) =>
        node.type === "WebPageNode" ? [[node.id, pageNodeSettingsOf(node.attributes ?? {})] as const] : [],
      ),
    ),
    layoutTemplates: nodes.flatMap((node) =>
      node.type === "LayoutTemplateNode"
        ? [
            {
              id: node.id,
              name: node.name ?? null,
            },
          ]
        : [],
    ),
  };
}

/**
 * The SET commands of a settings change, quoted (an unquoted boolean is applied, but the journal cannot read it back
 * for undo): the root first, then each page. Framer turns noIndexSite on with noIndex and keeps it on after noIndex
 * is turned off, so noIndexSite follows noIndex unless the call gives it.
 */
export function settingsCommands(
  site: SiteSettingsInput | undefined,
  pages: readonly (PageSettingsInput & { readonly id: string })[],
): string[] {
  return [
    ...(site === undefined ? [] : [setNode(ROOT_NODE_ID, attributesOf(site, SITE_SETTING_ATTRIBUTES))]),
    ...pages.map(({ id, ...page }) =>
      setNode(
        id,
        attributesOf(
          {
            ...page,
            noIndexSite: page.noIndexSite ?? page.noIndex,
          },
          PAGE_SETTING_ATTRIBUTES,
        ),
      ),
    ),
  ];
}

function siteMetadataOf(attributes: Readonly<Record<string, unknown>>): SiteMetadata {
  const text = (key: string) => textOf(pageMeta(attributes, key));

  return {
    title: text("title"),
    description: text("description"),
    socialImage: text("socialImage"),
    favicon: text("favicon"),
    faviconDark: text("faviconDark"),
    appleTouchIcon: text("appleTouchIcon"),
  };
}

/** Framer leaves out what is unset: no draft key is a published page, no layoutTemplate takes the home page's. */
function pageNodeSettingsOf(attributes: Readonly<Record<string, unknown>>): PageNodeSettings {
  const text = (key: string) => textOf(pageMeta(attributes, key));

  return {
    draft: flagOf(attributes["draft"]),
    metadata: {
      title: text("title"),
      description: text("description"),
      socialImage: text("socialImage"),
      noIndex: flagOf(pageMeta(attributes, "noIndex")),
      noIndexSite: flagOf(pageMeta(attributes, "noIndexSite")),
    },
    layoutTemplate: layoutTemplateOf(attributes["layoutTemplate"]),
  };
}

/** "null" is a page set to no template; a page without the key takes the home page's ("default"). */
function layoutTemplateOf(value: unknown): string | null {
  if (value === undefined) {
    return DEFAULT_LAYOUT_TEMPLATE;
  }

  return typeof value === "string" && value !== "null" ? value : null;
}

function flagOf(value: unknown): boolean {
  return typeof value === "boolean" ? value : value === "true";
}

/** The DSL attributes for the settings given, in the order of `names`. */
function attributesOf(
  settings: Readonly<Record<string, unknown>>,
  names: Readonly<Record<string, string>>,
): DslAttributes {
  return Object.fromEntries(
    Object.entries(names).flatMap(([setting, attribute]) => {
      const value = settings[setting];

      return value === undefined ? [] : [[attribute, value as string | boolean | null] as const];
    }),
  );
}

function textOf(value: string | boolean | null): string | null {
  return typeof value === "string" ? value : null;
}
