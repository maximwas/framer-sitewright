import type { FontStyle, FontWeight } from "./framer-port.ts";

export interface FontVariant {
  readonly weight: FontWeight | null;
  readonly style: FontStyle | null;
}

/** Framer's font library by family; variants sorted by weight, then style. */
export type FontFamilies = ReadonlyMap<string, readonly FontVariant[]>;
