import type { FontData, TextStyleData } from "../types/framer-port.ts";

/** A text style as the exporters need it. */
export type ExportTextStyle = Pick<
  TextStyleData,
  "fontSize" | "lineHeight" | "letterSpacing" | "transform" | "alignment" | "decoration" | "balance" | "tag"
> & { readonly font: Pick<FontData, "family" | "weight" | "style"> };

/** What a layer names by reference: tokens by id, text styles by path, name or id. */
export interface ExportContext {
  readonly tokens: ReadonlyMap<string, { readonly name: string; readonly light: string; readonly dark: string | null }>;
  readonly textStyles: ReadonlyMap<string, ExportTextStyle>;
}

/** The direction of the stack a layer sits in, or null outside a stack. */
export type StackDirection = "row" | "column" | null;

/** A layer ready to write out: its element, class, CSS declarations, text and children. */
export interface ExportElement {
  readonly tag: string;
  readonly className: string;
  readonly declarations: readonly (readonly [string, string])[];
  readonly attributes: Readonly<Record<string, string>>;
  readonly text: string | null;
  readonly children: readonly ExportElement[];
}
