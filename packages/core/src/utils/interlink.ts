/** What cms_interlink compares in an item. */
export interface LinkableItem {
  readonly slug: string;
  readonly category: string | null;
  readonly tags: readonly string[];
  readonly keyword: string | null;
}

/** Points for a shared category, for each shared tag, and for each shared word of the target keyword. */
export const INTERLINK_POINTS = {
  category: 3,
  tag: 2,
  keyword: 1,
} as const;

function words(text: string | null): Set<string> {
  return new Set(
    (text ?? "")
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter((word) => word.length > 2),
  );
}

function score(a: LinkableItem, b: LinkableItem): number {
  const tags = new Set(a.tags.map((tag) => tag.toLowerCase()));
  const keyword = words(a.keyword);

  return (
    (a.category !== null && a.category === b.category ? INTERLINK_POINTS.category : 0) +
    b.tags.filter((tag) => tags.has(tag.toLowerCase())).length * INTERLINK_POINTS.tag +
    [...words(b.keyword)].filter((word) => keyword.has(word)).length * INTERLINK_POINTS.keyword
  );
}

/** Each item's most related others, best first; items with nothing in common are left out. */
export function relatedItems(items: readonly LinkableItem[], top: number): Map<string, string[]> {
  return new Map(
    items.map((item) => [
      item.slug,
      items
        .filter((other) => other.slug !== item.slug)
        .map((other) => ({
          slug: other.slug,
          points: score(item, other),
        }))
        .filter(({ points }) => points > 0)
        .sort((a, b) => b.points - a.points || a.slug.localeCompare(b.slug))
        .slice(0, top)
        .map(({ slug }) => slug),
    ]),
  );
}
