import type * as z from "zod";
import type { LINK_KINDS } from "../constants/site-checks.ts";
import type { ContrastSchema, SiteFindingSchema, SiteImageSchema, SiteLinkSchema } from "../schemas/site-checks.ts";
import type { SerializedNode } from "./dsl.ts";

export type SiteFinding = z.infer<typeof SiteFindingSchema>;

export type SiteLink = z.infer<typeof SiteLinkSchema>;

export type SiteImage = z.infer<typeof SiteImageSchema>;

export type Contrast = z.infer<typeof ContrastSchema>;

export type LinkKind = (typeof LINK_KINDS)[number];

/** A web page as the site checks read it: its path, its own attributes and its primary breakpoint's tree. */
export interface CheckedPage {
  readonly path: string;
  /** The page node's attributes (metadata.title…); empty when the read could not see them (no Server API key). */
  readonly attributes: Readonly<Record<string, unknown>>;
  readonly content: SerializedNode | null;
  /** Whether the read carries every attribute (the Server API's): alt text and anchors are only checked then. */
  readonly complete: boolean;
}

/** What a text style tells the checks: its tag, size and color. */
export interface CheckedTextStyle {
  readonly tag: string;
  readonly fontSize: number | null;
  readonly color: string | null;
}

/** Project facts the checks resolve values with. */
export interface SiteCheckContext {
  /** A color token's light value by token id. */
  readonly token: (id: string) => string | null;
  readonly textStyle: (preset: unknown) => CheckedTextStyle | null;
}

/** A web page with its whole tree, for the checks that look past the primary breakpoint. */
export interface PageTree extends CheckedPage {
  /** The page node with every breakpoint, or null when the read found nothing. */
  readonly tree: SerializedNode | null;
  /** The layout template the page uses; null when it has none or the read cannot tell (no Server API key). */
  readonly layoutTemplateId: string | null;
}

/** A CMS collection as the checks read it: its name, and each item's slug and text values. */
export interface CheckedCollection {
  readonly name: string;
  readonly items: readonly { readonly slug: string; readonly texts: readonly string[] }[];
}
