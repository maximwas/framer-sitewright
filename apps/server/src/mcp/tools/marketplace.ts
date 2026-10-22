import type { McpServer } from "@modelcontextprotocol/server";
import { marketplaceItems } from "../../marketplace/item.ts";
import { MarketplaceItemInputSchema, MarketplaceItemOutputSchema } from "../../schemas/marketplace.ts";
import type { ToolContext } from "../../types/mcp.ts";
import { addTool } from "../add-tool.ts";

/**
 * Reading Marketplace pages changes nothing; inspecting puts each component on a temporary page. Two tools, so a
 * read-only agent can read, since a tool's annotations cannot depend on its arguments.
 */
export function registerMarketplaceTools(server: McpServer, { transports }: ToolContext): void {
  addTool(server, {
    name: "marketplace_item",
    title: "Look at Marketplace items",
    description:
      "Reads Marketplace item pages — links the user gives you (\"add this one, does it suit us?\") — and returns what each is: the author's description, author, price (null = free), preview, categories, when it was last updated, and for a free component the moduleUrl for component_insert. It changes nothing in the project. To read a free component's controls before placing it, use marketplace_item_inspect. Open previewUrl with your browser tools to see it move.",
    input: MarketplaceItemInputSchema,
    output: MarketplaceItemOutputSchema,
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: true,
    },
    run: ({ links }) => marketplaceItems(transports, links, false),
  });

  addTool(server, {
    name: "marketplace_item_inspect",
    title: "Inspect Marketplace components",
    description:
      "Does what marketplace_item does, and also inserts each free component on a temporary page, reads its controls with their defaults, types and the tool that writes each, and deletes the page again. Judge the fit from that before inserting it: does it take your own content (a slot takes ids of layers on the page; a list of images or of { image, … } entries takes image URLs through component_controls_set, which uploads them), does it size to its container or measure its first slide once (then one instance per breakpoint width), can its colors and type match the tokens, does it use a tween (set a spring with component_controls_set), was it updated recently.",
    input: MarketplaceItemInputSchema,
    output: MarketplaceItemOutputSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    run: ({ links }) => marketplaceItems(transports, links, true),
  });
}
