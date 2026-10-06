import type { MARKETPLACE_KINDS } from "../constants/marketplace.ts";

export type MarketplaceKind = (typeof MARKETPLACE_KINDS)[number];

/** A template or component as the Marketplace lists it. */
export interface MarketplaceItem {
  readonly title: string;
  readonly slug: string;
  readonly author: string;
  readonly kind: "template" | "component";
  /** null: free. */
  readonly price: string | null;
  readonly pageUrl: string;
  readonly previewUrl: string | null;
  readonly thumbnail: string | null;
  /** A component's module URL for component_insert; null for templates and paid components. */
  readonly moduleUrl: string | null;
  /** A free template's remix link. */
  readonly remixUrl: string | null;
}

export interface MarketplaceListing {
  readonly items: readonly MarketplaceItem[];
  /** Category slugs the page links to, for the next call. */
  readonly categories: readonly string[];
}

/** A Marketplace item as its own page describes it. */
export interface MarketplaceItemDetail {
  readonly title: string;
  readonly slug: string;
  readonly kind: "template" | "component";
  readonly author: string;
  /** null: free. */
  readonly price: string | null;
  readonly pageUrl: string;
  readonly previewUrl: string | null;
  /** A free component's module URL for component_insert. */
  readonly moduleUrl: string | null;
  readonly remixUrl: string | null;
  readonly categories: readonly string[];
  readonly updatedAt: string | null;
  readonly publishedAt: string | null;
  /** The author's description as plain text, clipped. */
  readonly description: string;
}
