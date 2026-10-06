import { CMS_LIST_ITEM_FIELD_TYPES } from "../constants/cms.ts";
import type { CmsFieldInput, CmsListItemFieldInput } from "../types/framer-port.ts";
import { isPlainObject } from "./guards.ts";

/** Whether a value can sit in a List entry: Framer nests no enums, references or Lists. */
export function isListItemInput(input: CmsFieldInput): input is CmsListItemFieldInput {
  return CMS_LIST_ITEM_FIELD_TYPES.some((type) => type === input.type);
}

/**
 * A slug as Framer keeps it (seen on the sandbox, 06.10.2026): lower case; every run of spaces and URL punctuation one
 * hyphen ("Hello, World" → hello-world, "x/y" and "x&y" → x-y); no hyphen at the ends. Letters with accents, other
 * scripts, emoji, digits, "-", ".", "_" and "~" stay ("a__b--c", "x.y", "café-olé").
 */
export function normalizeSlug(slug: string): string {
  return slug
    .normalize("NFC")
    .toLowerCase()
    .replace(/[\s!-,/:-@[-^`{-}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

/** The item a slug names: the same slug, else the one Framer would have kept for it. */
export function findBySlug<Item extends { readonly slug: string }>(
  items: readonly Item[],
  slug: string,
): Item | undefined {
  const normalized = normalizeSlug(slug);

  return items.find((item) => item.slug === slug) ?? items.find((item) => normalizeSlug(item.slug) === normalized);
}

/**
 * A page path as the DSL knows it: Framer lists a CMS detail page as /blog/:slug, and the DSL as /blog/:<Collection
 * name> (seen 06.10.2026); a page without a collection keeps its path.
 */
export function dslPagePath(path: string, collectionName: string | null): string {
  return collectionName === null ? path : path.replace(/(^|\/):[^/]+/, `$1:${collectionName}`);
}

/**
 * Whether a layer's attribute value names one of the ids: a binding (`var(--variable-<id>)`, `var(--variable-<ref>.<id>)`)
 * or a bare id (a collection list's filter or sorting), at any depth of objects and lists.
 */
export function mentionsAnyId(value: unknown, ids: readonly string[]): boolean {
  if (typeof value === "string") {
    return ids.some((id) => new RegExp(`(?<![\\w])${escapeRegExp(id)}(?![\\w])`, "u").test(value));
  }

  if (Array.isArray(value)) {
    return value.some((entry) => mentionsAnyId(entry, ids));
  }

  return isPlainObject(value) && Object.values(value).some((entry) => mentionsAnyId(entry, ids));
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
