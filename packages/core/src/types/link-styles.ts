import type * as z from "zod";
import type { LINK_STYLE_FIELDS } from "../constants/link-styles.ts";
import type {
  LinkStateInputSchema,
  LinkStateOutputSchema,
  LinkStyleInputSchema,
  LinkStyleOutputSchema,
} from "../schemas/link-styles.ts";
import type { DslAttributes } from "./dsl.ts";
import type { DslAttributeMap } from "./history.ts";
import type { StyleRef } from "./styles.ts";

export type LinkStyleInput = z.output<typeof LinkStyleInputSchema>;

export type LinkStateInput = z.output<typeof LinkStateInputSchema>;

export type LinkStyleOutput = z.input<typeof LinkStyleOutputSchema>;

export type LinkStateOutput = z.input<typeof LinkStateOutputSchema>;

export type LinkStyleField = (typeof LINK_STYLE_FIELDS)[number][0];

/** A link style as the DSL lists it: its canonical path, and its attributes as dotted keys (`link.hover.textColor`). */
export interface LinkStyleData {
  readonly id: string;
  readonly path: string;
  readonly attributes: DslAttributeMap;
}

export interface LinkStyleCreate {
  readonly path: string;
  readonly attributes: DslAttributes;
}

export interface LinkStyleUpdate {
  readonly path: string;
  readonly style: LinkStyleData;
  /** Only the attributes that change; null removes one. */
  readonly attributes: DslAttributes;
}

export interface LinkStylePlan {
  readonly creates: readonly LinkStyleCreate[];
  readonly updates: readonly LinkStyleUpdate[];
  readonly unchanged: readonly StyleRef[];
}
