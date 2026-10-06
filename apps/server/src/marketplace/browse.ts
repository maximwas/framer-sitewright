import { OperationError } from "@sitewright/core";
import { MARKETPLACE_TIMEOUT_MS, MARKETPLACE_URL, MARKETPLACE_USER_AGENT } from "../constants/marketplace.ts";
import type { MarketplaceItem, MarketplaceKind } from "../types/marketplace.ts";
import { parseMarketplacePage } from "../utils/marketplace.ts";

export interface BrowseRequest {
  readonly kind: MarketplaceKind;
  readonly category?: string;
  readonly query?: string;
  readonly freeOnly: boolean;
  readonly limit: number;
}

/**
 * A Marketplace listing in its own order (the Marketplace's current ranking): a category page, or the whole kind. A
 * query filters the names: the search pages render in the browser and hold no items.
 */
export async function browseMarketplace({ kind, category, query, freeOnly, limit }: BrowseRequest) {
  const source =
    category === undefined ? `${MARKETPLACE_URL}/${kind}/` : `${MARKETPLACE_URL}/${kind}/categories/${category}/`;
  const response = await fetch(source, {
    headers: {
      "user-agent": MARKETPLACE_USER_AGENT,
      accept: "text/html",
    },
    signal: AbortSignal.timeout(MARKETPLACE_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new OperationError(
      "NOT_FOUND",
      `The Marketplace answered ${response.status} for ${source}.`,
      "Leave the category out to see the categories there are.",
    );
  }

  const { items, categories } = parseMarketplacePage(await response.text());
  const words = (query ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  const matches = (item: MarketplaceItem) =>
    words.every((word) => `${item.title} ${item.slug}`.toLowerCase().includes(word));

  return {
    source,
    items: items.filter((item) => matches(item) && (!freeOnly || item.price === null)).slice(0, limit),
    categories: [...categories],
  };
}
