import {
  CATEGORY_LINK,
  FLIGHT_CHUNK,
  ITEM_DESCRIPTION_MAX,
  ITEM_PAGE,
  ITEM_RESOURCE,
  ITEM_START,
  MARKETPLACE_URL,
} from "../constants/marketplace.ts";
import type { MarketplaceItem, MarketplaceItemDetail, MarketplaceListing } from "../types/marketplace.ts";

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

/** The item a Marketplace detail page is about, with its description; null when the page holds none. */
export function parseMarketplaceItem(html: string): MarketplaceItemDetail | null {
  const data = [...html.matchAll(FLIGHT_CHUNK)].map(([, chunk]) => decodeChunk(chunk ?? "")).join("");
  const at = data.indexOf(ITEM_RESOURCE);
  const raw = at === -1 ? null : objectAt(data, at + ITEM_RESOURCE.indexOf("{"));
  const listed = itemOf(raw);

  if (listed === null || typeof raw !== "object" || raw === null) {
    return null;
  }

  const { attributes, body, updatedAt, publishedAt } = raw as Record<string, unknown>;
  const fields = typeof attributes === "object" && attributes !== null ? (attributes as Record<string, unknown>) : {};
  const categories = Array.isArray(fields.categories)
    ? fields.categories.flatMap((category) => {
        const name = text((category as Record<string, unknown> | null)?.name);

        return name === null ? [] : [name];
      })
    : [];

  return {
    title: listed.title,
    slug: listed.slug,
    kind: listed.kind,
    author: listed.author,
    // An item page writes the price as a bare number ("99"); the listing as "$99".
    price: listed.price === "0" ? null : (listed.price?.replace(/^(?=\d)/, "$") ?? null),
    pageUrl: listed.pageUrl,
    previewUrl: listed.previewUrl,
    moduleUrl: listed.kind === "component" && (listed.price === null || listed.price === "0") ? text(fields.url) : null,
    remixUrl: listed.remixUrl,
    categories,
    updatedAt: text(updatedAt),
    publishedAt: text(publishedAt),
    description: plainText(typeof body === "string" ? (textChunk(data, body) ?? body) : "").slice(
      0,
      ITEM_DESCRIPTION_MAX,
    ),
  };
}

/** A Marketplace page URL from a link, a "components/<slug>" path or a bare component slug. */
export function itemPageUrl(link: string): string | null {
  const page = ITEM_PAGE.exec(link.trim());

  if (page !== null) {
    return `${MARKETPLACE_URL}/${page[1]}/${page[2]}/`;
  }

  const path = /^(?:\/?marketplace\/)?(components|templates)\/([a-z0-9-]+)\/?$/.exec(link.trim());

  if (path !== null) {
    return `${MARKETPLACE_URL}/${path[1]}/${path[2]}/`;
  }

  return /^[a-z0-9-]+$/.test(link.trim()) ? `${MARKETPLACE_URL}/components/${link.trim()}/` : null;
}

/** A text the data refers to as "$44": its "44:T<hex length>," chunk, the length counted in UTF-8 bytes. */
function textChunk(data: string, reference: string): string | null {
  const id = /^\$([0-9a-f]+)$/.exec(reference)?.[1];
  const start = id === undefined ? null : new RegExp(`(?:^|\\n|>)${id}:T([0-9a-f]+),`).exec(data);

  if (start?.[1] === undefined) {
    return null;
  }

  const from = start.index + start[0].length;

  return new TextDecoder().decode(new TextEncoder().encode(data.slice(from)).slice(0, Number.parseInt(start[1], 16)));
}

/** HTML as readable text: block ends become line breaks, tags go, the common entities are decoded. */
function plainText(html: string): string {
  return html
    .replace(/<\/(p|h\d|li|ul|ol)>/g, "\n")
    .replace(/<li>/g, "- ")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
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
