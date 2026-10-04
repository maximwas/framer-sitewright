import type * as z from "zod";
import type { BREAKPOINT_LABELS } from "../constants/text-styles.ts";
import type {
  BreakpointOverrideSchema,
  ColorInputSchema,
  FontFallbackSchema,
  FontInputSchema,
  TextStyleInputSchema,
} from "../schemas/text-styles.ts";
import type { FontFamilies } from "./fonts.ts";
import type {
  ColorStyleHandle,
  FontStyle,
  FontWeight,
  TextStyleBreakpointWrite,
  TextStyleHandle,
} from "./framer-port.ts";
import type { StyleRef } from "./styles.ts";

export type BreakpointOverride = z.output<typeof BreakpointOverrideSchema>;

export type FontInput = z.output<typeof FontInputSchema>;

export type ColorInput = z.output<typeof ColorInputSchema>;

export type TextStyleInput = z.output<typeof TextStyleInputSchema>;

export type BreakpointLabel = (typeof BREAKPOINT_LABELS)[number];

export type BreakpointOverrides = Partial<Record<BreakpointLabel, BreakpointOverride>>;

/**
 * A font to write. From the library: its spelling of the family and a weight and style it has. Uploaded to the project
 * (`uploaded`): the API cannot list its variants, so what Framer stored is checked after the write (fontFallbacks).
 */
export interface ResolvedFont {
  readonly family: string;
  readonly weight: FontWeight;
  readonly style: FontStyle;
  readonly uploaded: boolean;
}

/** A style whose font Framer stored differently from the request: it substitutes a missing weight without an error. */
export type FontFallback = z.output<typeof FontFallbackSchema>;

/** A bound color token, or a raw color in Framer's rgb() form. */
export type ResolvedColor = { readonly token: ColorStyleHandle } | { readonly value: string };

/** Attributes both writers pass on as they are (the DSL under Framer's attribute names). */
export type PlainAttributes = Omit<TextStyleInput, "path" | "font" | "color" | "breakpoints">;

/** What to write for one style; an absent attribute keeps its current value. */
export interface TextStyleChanges {
  readonly plain: PlainAttributes;
  readonly font: ResolvedFont | undefined;
  readonly color: ResolvedColor | undefined;
  readonly breakpoints: BreakpointOverrides;
}

export interface TextStyleCreate {
  readonly path: string;
  readonly changes: TextStyleChanges;
}

export interface TextStyleUpdate extends TextStyleCreate {
  readonly style: TextStyleHandle;
}

export interface TextStylePlan {
  readonly creates: readonly TextStyleCreate[];
  readonly updates: readonly TextStyleUpdate[];
  readonly unchanged: readonly StyleRef[];
}

/** The project state a plan resolves against. */
export interface TextStyleContext {
  readonly existing: ReadonlyMap<string, TextStyleHandle>;
  readonly tokens: ReadonlyMap<string, ColorStyleHandle>;
  readonly fonts: FontFamilies;
  /** Families uploaded to the project, as far as its styles show them (uploadedFontFamilies). */
  readonly uploadedFonts: FontFamilies;
}

/** What one breakpoint slot sets: its sizes, without where it starts. */
export type SlotValues = Omit<TextStyleBreakpointWrite, "minWidth">;

/** Breakpoints as the Plugin API writes them, with the style's own minWidth (see pluginApiSlots). */
export interface PluginApiSlots {
  readonly minWidth: number;
  readonly breakpoints: TextStyleBreakpointWrite[];
}
