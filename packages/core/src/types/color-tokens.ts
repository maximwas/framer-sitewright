import type * as z from "zod";
import type { ColorTokenInputSchema } from "../schemas/color-tokens.ts";
import type { ColorStyleHandle } from "./framer-port.ts";
import type { StyleRef } from "./styles.ts";

export type ColorTokenInput = z.output<typeof ColorTokenInputSchema>;

/** A token with a canonical path and colors in Framer's rgb() form. */
export interface NormalizedToken {
  readonly path: string;
  readonly light: string;
  /** null removes the dark color, undefined keeps it. */
  readonly dark: string | null | undefined;
}

/** An existing token; only the channels that differ from Framer's values are set. */
export interface TokenUpdate {
  readonly path: string;
  readonly style: ColorStyleHandle;
  readonly light: string | undefined;
  readonly dark: string | null | undefined;
}

export interface ColorTokenPlan {
  readonly creates: readonly NormalizedToken[];
  readonly updates: readonly TokenUpdate[];
  readonly unchanged: readonly StyleRef[];
}
