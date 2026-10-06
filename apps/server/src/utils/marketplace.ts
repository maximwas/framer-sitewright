import { CATEGORY_LINK, FLIGHT_CHUNK, ITEM_START, MARKETPLACE_URL } from "../constants/marketplace.ts";
import type { MarketplaceItem, MarketplaceListing } from "../types/marketplace.ts";

/** The items and category links of a Marketplace page, from the data Next.js streams into its HTML. */
export function parseMarketplacePage(html: string): MarketplaceListing {
  const data = [...html.matchAll(FLIGHT_CHUNK)].map(([, chunk]) => decodeChunk(chunk ?? "")).join("");
  const items = new Map<string, MarketplaceItem>();

  for (const match of data.matchAll(ITEM_START)) {
    const item = itemOf(objectAt(data, match.index));

    if (item !== null && !items.has(item.slug)) {
      items.set(item.slug, item);
    }
  }

  return {
    items: [...items.values()],
    categories: [...new Set([...html.matchAll(CATEGORY_LINK)].map(([, , slug]) => slug ?? ""))].filter(Boolean),
  };
}

function decodeChunk(chunk: string): string {
  try {
    return JSON.parse(`"${chunk}"`) as string;
  } catch {
    return "";
  }
}

/** The JSON object that starts at `start`, by its balanced braces; null when it does not close. */
function objectAt(text: string, start: number): unknown {
  let depth = 0;
  let quoted = false;

  for (let index = start; index < text.length; index += 1) {
    const char = text[index];

    if (quoted) {
      if (char === "\\") {
        index += 1;
      } else if (char === '"') {
        quoted = false;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;

      if (depth === 0) {
        try {
          return JSON.parse(text.slice(start, index + 1)) as unknown;
        } catch {
          return null;
        }
      }
    }
  }

  return null;
}

function itemOf(raw: unknown): MarketplaceItem | null {
  if (typeof raw !== "object" || raw === null) {
    return null;
  }

  const { title, slug, author, media, type, attributes } = raw as Record<string, unknown>;

  if (typeof title !== "string" || typeof slug !== "string" || (type !== "template" && type !== "component")) {
    return null;
  }

  const fields = typeof attributes === "object" && attributes !== null ? (attributes as Record<string, unknown>) : {};
  const price = text(fields.price);
  const firstMedia = Array.isArray(media) ? (media[0] as Record<string, unknown> | undefined) : undefined;

  return {
    title,
    slug,
    author: text((author as Record<string, unknown> | undefined)?.name) ?? "",
    kind: type,
    price,
    pageUrl: `${MARKETPLACE_URL}/${type}s/${slug}/`,
    previewUrl: text(fields.previewUrl),
    thumbnail: text(firstMedia?.url),
    moduleUrl: type === "component" && price === null ? text(fields.url) : null,
    remixUrl: text(fields.remixUrl),
  };
}

/**
 * A string field. Next.js writes a missing value as "$undefined" and references as "$L1" or "$@2": a "$" before a
 * letter or "@"; a price ("$99") keeps its digit.
 */
function text(value: unknown): string | null {
  if (typeof value === "number") {
    return String(value);
  }

  return typeof value === "string" && value !== "" && !/^\$[A-Za-z@]/.test(value) ? value : null;
}
