import type { FontFamilies } from "../types/fonts.ts";

export const FONT_WEIGHTS = [100, 200, 300, 400, 500, 600, 700, 800, 900] as const;

export const FONT_STYLES = ["normal", "italic"] as const;

/** An empty font library, for upserts that set no font and so never load the real one. */
export const NO_FONTS: FontFamilies = new Map();
