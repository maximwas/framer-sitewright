import { TEMPLATE_REPEAT } from "../constants/layout-audit.ts";
import {
  BRAND_NAMES,
  COPY_SLUG,
  COPYRIGHT_YEAR,
  DEFAULT_LAYER_NAME,
  LOGO_CONTEXT,
  LOGO_NAME_NOISE,
  PLACEHOLDER_TEXT,
  QUOTE_MAX,
  SHAPE_DEPTH,
  UNCLEAR_COLLECTION_NAME,
} from "../constants/template-audit.ts";
import { attr, childrenOf, isFrame, isText, textContent, walk } from "../layout-audit/tree.ts";
import type { SerializedNode } from "../types/dsl.ts";
import type { CheckedCollection, CheckedPage, SiteFinding } from "../types/site-checks.ts";
import { clipText, countOf } from "../utils/text.ts";
import { attributeText, finding, foldFindings } from "./values.ts";

/**
 * Content a buyer edits layer by layer because it was copied by hand: three or more sibling frames built alike, each
 * with a photo and two texts (posts, cases, team) or with three texts (testimonials, jobs). Component instances and
 * Collection Lists are left alone, and so are stats and nav links (fewer texts).
 */
export function handCopiedFindings(page: CheckedPage): SiteFinding[] {
  if (page.content === null) {
    return [];
  }

  const root = page.content;

  return walk(root).flatMap((parent) => {
    if (parent === root || isCollectionList(parent)) {
      return [];
    }

    const groups = new Map<string, SerializedNode[]>();

    for (const child of childrenOf(parent).filter(isFrame)) {
      const shape = shapeOf(child, 0);

      groups.set(shape, [...(groups.get(shape) ?? []), child]);
    }

    return [...groups.values()].flatMap((group) => {
      const [first] = group;
      const texts = first === undefined ? 0 : walk(first).filter(isText).length;
      const photos = first === undefined ? 0 : walk(first).filter(hasPhoto).length;

      if (group.length < TEMPLATE_REPEAT || texts < 2 || (photos === 0 && texts < 3)) {
        return [];
      }

      return [
        finding(
          "hand-copied-content",
          photos > 0 ? "likely" : "taste",
          page.path,
          parent,
          `${group.length} frames in "${parent.name ?? parent.id}" are built alike (${group
            .map((frame) => frame.name ?? frame.id)
            .join(", ")}), each with its own copy of the content.`,
          "Posts, cases, team members, testimonials or jobs belong in a CMS collection shown by a Collection List, so the buyer adds one by filling in a form; anything else becomes one component with controls.",
        ),
      ];
    });
  });
}

/** Collections a buyer cannot make sense of: empty, still named "Collection 2", or holding duplicated -copy slugs. */
export function collectionFindings(collections: readonly CheckedCollection[]): SiteFinding[] {
  return collections.flatMap(({ name, items }) => {
    const copies = items.filter(({ slug }) => COPY_SLUG.test(slug)).map(({ slug }) => slug);

    return [
      ...(copies.length === 0
        ? []
        : [
            finding(
              "copy-slug",
              "likely",
              "/",
              null,
              `The CMS collection "${name}" has items duplicated without a new slug: ${copies.join(", ")}.`,
              "Give each item its own slug from its title (cms_items_upsert): -copy slugs show in the page URLs.",
            ),
          ]),
      ...(items.length === 0
        ? [
            finding(
              "empty-collection",
              "likely",
              "/",
              null,
              `The CMS collection "${name}" has no items.`,
              "Fill it with about six realistic items, or delete it when nothing shows it.",
            ),
          ]
        : []),
      ...(UNCLEAR_COLLECTION_NAME.test(name.trim())
        ? [
            finding(
              "collection-name",
              "taste",
              "/",
              null,
              `The CMS collection "${name}" still has the name Framer gave it.`,
              "Name it by what it holds (Projects, Journal, Team), as the buyer will look for it.",
            ),
          ]
        : []),
    ];
  });
}

/** Frames left with Framer's default names ("Frame 12", "Stack") or none: one finding per page that counts them. */
export function layerNameFindings(page: CheckedPage): SiteFinding[] {
  if (page.content === null) {
    return [];
  }

  const root = page.content;
  const unnamed = walk(root).filter(
    (node) => node !== root && isFrame(node) && (node.name === undefined || DEFAULT_LAYER_NAME.test(node.name)),
  );
  const [first] = unnamed;

  return first === undefined
    ? []
    : [
        finding(
          "default-layer-names",
          "likely",
          page.path,
          first,
          `${countOf(unnamed.length, "layer")} on ${page.path} ${unnamed.length === 1 ? "keeps" : "keep"} a default name or none (${unnamed
            .slice(0, 5)
            .map((node) => node.name ?? node.id)
            .join(", ")}${unnamed.length > 5 ? ", …" : ""}).`,
          "Name each layer by its role (Hero, Card, Price, Footer Links): buyers find their way by layer names. design_apply sets name on each id.",
        ),
      ];
}

/** Placeholder copy and a copyright year that has passed, in the text layers of a page. */
export function placeholderFindings(page: CheckedPage, year: number): SiteFinding[] {
  if (page.content === null) {
    return [];
  }

  const texts = walk(page.content)
    .filter(isText)
    .map((node) => ({
      node,
      text: plainText(node),
    }));
  const placeholders = texts.flatMap(({ node, text }) =>
    PLACEHOLDER_TEXT.test(text)
      ? [
          finding(
            "placeholder-text",
            "defect",
            page.path,
            node,
            `"${clipText(text, QUOTE_MAX)}" on ${page.path} is placeholder text.`,
            "Write realistic copy for the template's audience: buyers judge the template by its preview.",
          ),
        ]
      : [],
  );
  const years = texts.flatMap(({ node, text }) => {
    const written = Number(COPYRIGHT_YEAR.exec(text)?.[1] ?? year);

    return written < year
      ? [
          finding(
            "old-copyright-year",
            "likely",
            page.path,
            node,
            `"${clipText(text, QUOTE_MAX)}" names ${written}; it is ${year}.`,
            `Write ${year}: a past year makes the template look abandoned.`,
          ),
        ]
      : [];
  });

  return foldFindings([...placeholders, ...years]);
}

/** Placeholder copy in CMS items: one finding per collection. */
export function cmsTextFindings(collections: readonly CheckedCollection[]): SiteFinding[] {
  return collections.flatMap(({ name, items }) => {
    const slugs = items
      .filter(({ texts }) => texts.some((text) => PLACEHOLDER_TEXT.test(text)))
      .map(({ slug }) => slug);

    return slugs.length === 0
      ? []
      : [
          finding(
            "placeholder-text",
            "defect",
            "/",
            null,
            `CMS items of "${name}" hold placeholder text: ${slugs.join(", ")}.`,
            "Write realistic items (cms_items_upsert): their detail pages are part of the preview.",
          ),
        ];
  });
}

/**
 * Real companies' logos: a layer named after a company (a "Google" SVG, "logo-stripe.svg") in a logo strip or named
 * as a logo, or a component instance whose control picks a company's logo by name.
 */
export function logoFindings(page: CheckedPage): SiteFinding[] {
  const findings: SiteFinding[] = [];

  if (page.content !== null) {
    visit(page.content, false);
  }

  return findings;

  function visit(node: SerializedNode, inStrip: boolean): void {
    const name = node.name ?? "";
    const named = brandOf(name);
    const picked = Object.entries(node.attributes ?? {}).flatMap(([key, value]) =>
      key.startsWith("$control__") && typeof value === "string" && BRAND_NAMES.has(value.trim().toLowerCase())
        ? [value]
        : [],
    );
    const brand = named !== null && (inStrip || /logo/i.test(name)) ? named : (picked[0] ?? null);

    if (brand !== null) {
      findings.push(
        finding(
          "brand-logo",
          "likely",
          page.path,
          node,
          `"${node.name ?? node.id}" on ${page.path} is a real company's logo (${brand}).`,
          "Use invented logos (a wordmark set in the template's fonts, or abstract marks): Framer's template rules forbid companies' logos shown without permission.",
        ),
      );

      return;
    }

    for (const child of childrenOf(node)) {
      visit(child, inStrip || LOGO_CONTEXT.test(name));
    }
  }
}

/** The company a layer is named after: "Google", "Google Logo", "logo-stripe.svg"; null for anything else. */
function brandOf(name: string): string | null {
  const bare = name
    .toLowerCase()
    .replace(/[-_/.]+/g, " ")
    .replace(LOGO_NAME_NOISE, " ")
    .replace(/\s+/g, " ")
    .trim();

  return BRAND_NAMES.has(bare) ? bare.replace(/\b\w/g, (letter) => letter.toUpperCase()) : null;
}

/** How a frame is built: its type and photo, and its children's shapes, a few levels down. Text is a leaf. */
function shapeOf(node: SerializedNode, depth: number): string {
  if (isText(node)) {
    return "text";
  }

  const own = `${node.type}${hasPhoto(node) ? "+photo" : ""}`;
  const children = depth >= SHAPE_DEPTH ? [] : childrenOf(node).map((child) => shapeOf(child, depth + 1));

  return children.length === 0 ? own : `${own}(${children.join(",")})`;
}

function hasPhoto(node: SerializedNode): boolean {
  return /^https?:\/\//.test(attributeText(node, "fill") ?? "") || attr(node, "backgroundImage") !== null;
}

/** A Collection List: its one child is the template of every item. */
function isCollectionList(node: SerializedNode): boolean {
  return Object.keys(node.attributes ?? {}).some((name) => name.startsWith("collectionList"));
}

/** A rich text's plain text: its own (the Plugin API) or its runs' (the Server API). */
function plainText(node: SerializedNode): string {
  return (
    textContent(node) ??
    walk(node)
      .flatMap((inner) => (inner.type === "TextRun" ? [attr(inner, "text") ?? ""] : []))
      .join("")
  );
}
