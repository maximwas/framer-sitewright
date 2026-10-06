import type { FontData } from "../types/framer-port.ts";

/** A font Framer reports somewhere in the project, and where: a text style's name or "a layer". */
export interface FontUse {
  readonly font: Pick<FontData, "family" | "weight" | "style">;
  readonly where: string;
}

/** Each family once, its variants in weight order, and the text styles and layer count that use it. */
export function fontsInUse(uses: readonly FontUse[]) {
  const families = new Map<string, { variants: Set<string>; styles: Set<string>; layers: number }>();

  for (const { font, where } of uses) {
    const entry = families.get(font.family) ?? {
      variants: new Set(),
      styles: new Set(),
      layers: 0,
    };

    entry.variants.add(`${font.weight ?? 400}${font.style === "italic" ? " italic" : ""}`);

    if (where === "layer") {
      entry.layers += 1;
    } else {
      entry.styles.add(where);
    }

    families.set(font.family, entry);
  }

  return [...families]
    .map(([family, { variants, styles, layers }]) => ({
      family,
      variants: [...variants].sort((a, b) => Number.parseInt(a, 10) - Number.parseInt(b, 10) || a.localeCompare(b)),
      textStyles: [...styles].sort(),
      layers,
    }))
    .sort((a, b) => a.family.localeCompare(b.family));
}
