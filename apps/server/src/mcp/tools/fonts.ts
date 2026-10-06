import type { McpServer } from "@modelcontextprotocol/server";
import { fontsSearch } from "@sitewright/core";
import { discoverFonts } from "../../fonts-web/discover.ts";
import { FontsDiscoverInputSchema, FontsDiscoverOutputSchema } from "../../schemas/fonts-web.ts";
import type { ToolContext } from "../../types/mcp.ts";
import { addOperationTool, addTool } from "../add-tool.ts";

export function registerFontTools(server: McpServer, context: ToolContext): void {
  const { transports, journal } = context;

  addTool(server, {
    name: "fonts_discover",
    title: "Discover fonts",
    description:
      "Finds fonts beyond Framer's library search, in Google Fonts and Fontshare: by words of the name, category (sans, serif, display, slab, mono, handwriting) and order (popular, trending, new). Each comes with its license in plain words, its weights, a specimen link, and whether Framer's library has it (inFramer). Propose two or three pairings from it, not only Inter-like defaults, and pass script for the site's language (cyrillic for Ukrainian: most Fontshare families are Latin only); a currency sign such as ₴ can still be missing, so check it in the specimen. Google Fonts (OFL) may be uploaded anywhere: pass files true for its woff2 files, upload each with file_upload, then use the family in text_styles_upsert. Fontshare's license (ITF FFL v2.0) allows uploading its files only to the user's own site: for a client's site or a sold template use a family with inFramer true from Framer's library.",
    input: FontsDiscoverInputSchema,
    output: FontsDiscoverOutputSchema,
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: true,
    },
    run: (input) =>
      journal.read(
        "fonts_discover",
        "Font discovery",
        "plugin-api",
        (result) => ({
          subject: [input.query, input.category].filter((part) => part !== undefined).join(", ") || "Fonts",
          summary: result === null ? null : `${result.fonts.length} of ${result.totalMatches}`,
        }),
        () => discoverFonts(transports, input),
      ),
  });
  addOperationTool(server, context, fontsSearch, {
    name: "fonts_search",
    title: "Search fonts",
    description:
      "Searches fonts by family name: Framer's library with its weights and styles, and fonts uploaded to the project (source project) with the variants its text styles use. Framer swaps a weight the project lacks without an error; text_styles_upsert reports that as fontFallbacks.",
  });
}
