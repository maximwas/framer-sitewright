import type * as z from "zod";
import type { FoundLayerSchema, RedirectSchema, TextChangeSchema } from "../schemas/site.ts";
import type { PluginNodeRecord } from "./plugin-nodes.ts";

export type FoundLayer = z.infer<typeof FoundLayerSchema>;

export type TextChange = z.infer<typeof TextChangeSchema>;

export type TextFormatting = TextChange["formatting"];

/** A text layer that holds the text to replace, as the walk found it. */
export interface TextMatch {
  readonly node: PluginNodeRecord;
  readonly id: string;
  readonly page: string;
  /** The breakpoint copy it is on; null on the primary breakpoint. */
  readonly breakpoint: string | null;
  /** On a copy: the primary layer it copies, when the Plugin API names it. */
  readonly originalId: string | null;
  readonly before: string;
  readonly after: string;
}

/** What one round of writes did: the matches replaced, and why the others were not. */
export interface TextWrites {
  readonly replaced: readonly TextMatch[];
  readonly failed: readonly string[];
}

export type RedirectSummary = z.infer<typeof RedirectSchema>;
