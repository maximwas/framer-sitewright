import type { SettingItem } from "../types/settings.ts";

/** The switches of what the agent may do, each with what it gives: the journal page and `sitewright settings` show them. */
export const SETTING_ITEMS: readonly SettingItem[] = [
  {
    key: "pluginFirst",
    label: "Plugin first",
    info: "While the Framer plugin is connected, the agent works through it, so changes land live in the editor. Only what needs Framer's layout language (sections, components, effects), screenshots and catalogs go through the Server API. Off: the Server API does everything it can.",
  },
  {
    key: "customCode",
    label: "Custom code",
    info: "Lets the agent add HTML to every page of the site: analytics, verification tags, embeds. Off: the agent tells you what needs code instead of writing it.",
  },
  {
    key: "codeComponents",
    label: "Code components",
    info: "Lets the agent write React code components and overrides for what the canvas cannot do. Off: it builds with canvas components, variants and effects only.",
  },
  {
    key: "supportReminders",
    label: "Support reminders",
    info: "Sitewright is free. At most once a week, after a change, Claude mentions how to support its development. Off: never.",
  },
];
