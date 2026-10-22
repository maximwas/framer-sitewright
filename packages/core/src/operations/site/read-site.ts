import { SITE_CHECK_DEPTH } from "../../constants/site-checks.ts";
import { OperationError } from "../../errors.ts";
import { childrenOf } from "../../layout-audit/tree.ts";
import type { SiteMetadata } from "../../site-checks/seo.ts";
import { pageMeta } from "../../site-checks/seo.ts";
import type { SerializedNode } from "../../types/dsl.ts";
import type { FramerRuntime } from "../../types/framer.ts";
import type { FramerPort } from "../../types/framer-port.ts";
import type { CheckedCollection, CheckedTextStyle, PageTree, SiteCheckContext } from "../../types/site-checks.ts";
import { errorMessage } from "../../utils/errors.ts";
import { readNodeTree } from "../nodes/read-tree.ts";

/**
 * The site's web pages (or the one at `pagePath`), each with its own attributes, its primary breakpoint's tree, the
 * whole tree and its layout template. A page Framer cannot read is left out of a site-wide read and named in `unread`
 * with why, so one page never stops the run; asked for by `pagePath`, its error is thrown.
 */
export async function readSitePages(
  runtime: FramerRuntime,
  pagePath?: string,
): Promise<{ pages: PageTree[]; rootId: string | null; unread: string[] }> {
  const all = (await runtime.port.getNodesWithType("WebPageNode")).filter(
    (page): page is typeof page & { path: string } =>
      page.path !== null && (pagePath === undefined || page.path === pagePath),
  );

  if (pagePath !== undefined && all.length === 0) {
    throw new OperationError(
      "NOT_FOUND",
      `No web page with path "${pagePath}".`,
      "Call project_overview to list pages.",
    );
  }

  let rootId: string | null = null;
  const pages: PageTree[] = [];
  const unread: string[] = [];

  for (const page of all) {
    let tree: SerializedNode | null;

    try {
      tree = await readNodeTree(runtime, page.id, SITE_CHECK_DEPTH, page.path);
    } catch (error) {
      if (pagePath !== undefined) {
        throw error;
      }

      unread.push(`${page.path} (${errorMessage(error)})`);
      continue;
    }

    rootId ??= typeof tree?.$parentId === "string" ? tree.$parentId : null;
    pages.push({
      path: page.path,
      attributes: tree?.attributes ?? {},
      content: primaryOf(tree),
      complete: runtime.agent !== null,
      tree,
      layoutTemplateId: typeof tree?.["$layoutTemplateId"] === "string" ? tree["$layoutTemplateId"] : null,
    });
  }

  return {
    pages,
    rootId,
    unread,
  };
}

/** How a check's summary starts the list of pages it could not read (site_audit looks for it). */
export const UNREAD_NOTE = " Not read, so not checked: ";

/** The pages a check could not read, for the end of its summary; "" when it read them all. */
export function unreadNote(unread: readonly string[]): string {
  return unread.length === 0 ? "" : `${UNREAD_NOTE}${unread.join("; ")}.`;
}

/** The site's own metadata on the root node, when the read can see it (the Server API). */
export async function readSiteMetadata(runtime: FramerRuntime, rootId: string | null): Promise<SiteMetadata | null> {
  if (rootId === null || runtime.agent === null) {
    return null;
  }

  const root = await readNodeTree(runtime, rootId, 0, "/");
  const attributes = root?.attributes ?? {};
  const text = (key: string) => {
    const value = pageMeta(attributes, key);

    return typeof value === "string" ? value : null;
  };

  return {
    title: text("title"),
    description: text("description"),
    socialImage: text("socialImage"),
    favicon: text("favicon"),
  };
}

/** Tokens and text styles, for resolving colors, sizes and heading tags. */
export async function siteCheckContext(runtime: FramerRuntime): Promise<SiteCheckContext> {
  const [colors, styles] = await Promise.all([runtime.port.getColorStyles(), runtime.port.getTextStyles()]);
  const tokens = new Map(colors.map((color) => [color.id, color.light]));
  const lookup = new Map<string, CheckedTextStyle>();

  for (const style of styles) {
    const summary: CheckedTextStyle = {
      tag: style.tag,
      fontSize: px(style.fontSize),
      color: typeof style.color === "string" ? style.color : style.color.light,
    };

    for (const key of [style.id, style.path, style.path.replace(/^\//, ""), style.name]) {
      lookup.set(key, summary);
    }
  }

  return {
    token: (id) => tokens.get(id) ?? null,
    textStyle: (preset) => (typeof preset === "string" ? (lookup.get(preset) ?? null) : null),
  };
}

/** Every CMS collection with its items' slugs and text values (plain and formatted text, without tags). */
export async function readCollections(port: FramerPort): Promise<CheckedCollection[]> {
  return Promise.all(
    (await port.getCollections()).map(async (collection) => ({
      name: collection.name,
      items: (await collection.getItems()).map((item) => ({
        slug: item.slug,
        texts: Object.values(item.fieldData).flatMap(({ type, value }) =>
          (type === "string" || type === "formattedText") && typeof value === "string"
            ? [value.replace(/<[^>]*>/g, " ")]
            : [],
        ),
      })),
    })),
  );
}

/** A page tree's primary breakpoint: what visitors on the widest screens see; the page itself when it has none. */
function primaryOf(tree: SerializedNode | null): SerializedNode | null {
  if (tree === null) {
    return null;
  }

  const breakpoints = childrenOf(tree);

  return breakpoints.find((breakpoint) => breakpoint.$isPrimary) ?? breakpoints[0] ?? tree;
}

function px(value: string): number | null {
  const match = /^(\d+(?:\.\d+)?)px$/.exec(value.trim());

  return match?.[1] === undefined ? null : Number(match[1]);
}
