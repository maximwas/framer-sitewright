import type { McpServer } from "@modelcontextprotocol/server";
import { localeAdd, localesList, localizationGet, localizationSet } from "@sitewright/core";
import type { ToolContext } from "../../types/mcp.ts";
import { addOperationTool } from "../add-tool.ts";

export function registerLocalizationTools(server: McpServer, context: ToolContext): void {
  addOperationTool(server, context, localesList, {
    name: "locales_list",
    title: "List locales",
    description:
      "Lists the site's locales (code, name, URL slug, fallback) and which one is the default. Add one with locale_add.",
  });

  addOperationTool(server, context, localeAdd, {
    name: "locale_add",
    title: "Add a locale",
    description:
      'Adds a locale to the site: a language ("nl" or "Dutch"), optionally for a region ("nl-BE", or region "BE"). A wrong language returns the languages Framer knows, a wrong region the language\'s regions. It is a draft by default: a draft locale stays off the published site until the user turns it on, so translate first with localization_get and localization_set. fallback names the site locale shown where a translation is missing; slug and name default to ones from the code. Needs the project\'s Server API key (Framer\'s createLocale is alpha and Server API only). Returns the locale\'s id, code, name, URL slug, draft and fallback. Undo does not remove a locale: the user removes it in the editor.',
  });

  addOperationTool(server, context, localizationGet, {
    name: "localization_get",
    title: "Read translations",
    description:
      "Lists translatable texts (pages, CMS items, components, site settings) with their default-locale text and the translation for one locale. missing: true lists only what still needs translating. Page through with offset.",
  });

  addOperationTool(server, context, localizationSet, {
    name: "localization_set",
    title: "Write translations",
    description:
      "Writes translations for one locale by source id from localization_get (null clears one, so the fallback shows), and can mark groups ready or excluded for the locale. Keep the markup of formattedText sources (the HTML tags) and translate only the text. Undo does not restore translations yet: the previous values are in the result.",
  });
}
