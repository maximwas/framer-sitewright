import type { McpServer } from "@modelcontextprotocol/server";
import { localesList, localizationGet, localizationSet } from "@sitewright/core";
import type { ToolContext } from "../../types/mcp.ts";
import { addOperationTool } from "../add-tool.ts";

export function registerLocalizationTools(server: McpServer, context: ToolContext): void {
  addOperationTool(server, context, localesList, {
    name: "locales_list",
    title: "List locales",
    description:
      "Lists the site's locales (code, name, URL slug, fallback) and which one is the default. The user adds locales in the Framer editor; there is no tool for it.",
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
