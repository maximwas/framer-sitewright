import type { McpServer } from "@modelcontextprotocol/server";
import { browseMarketplace } from "../../marketplace/browse.ts";
import { MarketplaceInputSchema, MarketplaceOutputSchema } from "../../schemas/marketplace.ts";
import { addTool } from "../add-tool.ts";

export function registerMarketplaceTools(server: McpServer): void {
  addTool(server, {
    name: "marketplace_browse",
    title: "Browse the Framer Marketplace",
    description:
      "Reads the Framer Marketplace in its current ranking: templates of a category (agency, consulting, saas, portfolio…), to see what sells now before proposing a direction, or components (carousels, tickers, effects) to offer the user instead of building them. Each item has its page, live preview, price (null = free) and, for a free component, the moduleUrl that component_insert inserts. Without a category you get the whole kind and the category slugs there are; query filters by name. Open the previews you name with your browser tools when you can.",
    input: MarketplaceInputSchema,
    output: MarketplaceOutputSchema,
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: true,
    },
    run: (input) => browseMarketplace(input),
  });
}
