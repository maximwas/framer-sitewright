import type { McpServer } from "@modelcontextprotocol/server";
import { browseMarketplace } from "../../marketplace/browse.ts";
import { marketplaceItems } from "../../marketplace/item.ts";
import {
  MarketplaceInputSchema,
  MarketplaceItemInputSchema,
  MarketplaceItemOutputSchema,
  MarketplaceOutputSchema,
} from "../../schemas/marketplace.ts";
import type { ToolContext } from "../../types/mcp.ts";
import { addTool } from "../add-tool.ts";

export function registerMarketplaceTools(server: McpServer, { transports }: ToolContext): void {
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
  addTool(server, {
    name: "marketplace_item",
    title: "Look at Marketplace items",
    description:
      'Reads Marketplace item pages — links the user gives you ("add this one, does it suit us?"), or pageUrl values from marketplace_browse — and returns what each is: the author\'s description, author, price (null = free), preview, categories, when it was last updated, and for a free component the moduleUrl for component_insert. With inspect true, each free component is inserted on a temporary page, its controls are read with their defaults, types and the tool that writes each, and the page is deleted again. Judge the fit from that before inserting it: does it take your own content (a slot takes ids of layers on the page; a list of images or of { image, … } entries takes image URLs through component_controls_set, which uploads them), does it size to its container or measure its first slide once (then one instance per breakpoint width), can its colors and type match the tokens, does it use a tween (set a spring with component_controls_set), was it updated recently. Open previewUrl with your browser tools to see it move.',
    input: MarketplaceItemInputSchema,
    output: MarketplaceItemOutputSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    run: ({ links, inspect }) => marketplaceItems(transports, links, inspect),
  });
}
