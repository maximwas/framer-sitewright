/** The schemes palette_generate builds around a base color. */
export const PALETTE_SCHEMES = [
  "monochromatic",
  "shades",
  "analogous",
  "complementary",
  "splitComplementary",
  "triadic",
  "tetradic",
] as const;

export type PaletteScheme = (typeof PALETTE_SCHEMES)[number];

interface Hsl {
  readonly h: number;
  readonly s: number;
  readonly l: number;
}

/** #rrggbb (or #rgb) as HSL, hue in degrees, saturation and lightness 0–1; null for anything else. */
export function hexToHsl(hex: string): Hsl | null {
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(hex);
  const full = short === null ? hex : `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`;
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(full);

  if (match === null) {
    return null;
  }

  const [r, g, b] = [match[1], match[2], match[3]].map((part) => Number.parseInt(part ?? "0", 16) / 255) as [
    number,
    number,
    number,
  ];
  const [max, min] = [Math.max(r, g, b), Math.min(r, g, b)];
  const l = (max + min) / 2;
  const d = max - min;

  if (d === 0) {
    return {
      h: 0,
      s: 0,
      l,
    };
  }

  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;

  return {
    h: (h * 60 + 360) % 360,
    s,
    l,
  };
}

export function hslToHex({ h, s, l }: Hsl): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x];

  return `#${[r, g, b]
    .map((channel) =>
      Math.round((channel + m) * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

const turn = (hsl: Hsl, degrees: number): Hsl => ({
  ...hsl,
  h: (hsl.h + degrees + 360) % 360,
});
const lightness = (hsl: Hsl, l: number): Hsl => ({
  ...hsl,
  l: Math.min(0.97, Math.max(0.05, l)),
});

/** Five colors around the base for the scheme, the base first. */
export function paletteOf(base: string, scheme: PaletteScheme): string[] | null {
  const hsl = hexToHsl(base);

  if (hsl === null) {
    return null;
  }

  const colors: Hsl[] = {
    monochromatic: [
      hsl,
      lightness(hsl, hsl.l + 0.3),
      lightness(hsl, hsl.l + 0.15),
      lightness(hsl, hsl.l - 0.15),
      lightness(hsl, hsl.l - 0.3),
    ],
    shades: [hsl, lightness(hsl, 0.92), lightness(hsl, 0.7), lightness(hsl, 0.3), lightness(hsl, 0.12)],
    analogous: [hsl, turn(hsl, -30), turn(hsl, 30), turn(hsl, -60), turn(hsl, 60)],
    complementary: [hsl, turn(hsl, 180), lightness(hsl, 0.92), lightness(turn(hsl, 180), 0.3), lightness(hsl, 0.12)],
    splitComplementary: [hsl, turn(hsl, 150), turn(hsl, 210), lightness(hsl, 0.92), lightness(hsl, 0.12)],
    triadic: [hsl, turn(hsl, 120), turn(hsl, 240), lightness(hsl, 0.92), lightness(hsl, 0.12)],
    tetradic: [hsl, turn(hsl, 90), turn(hsl, 180), turn(hsl, 270), lightness(hsl, 0.12)],
  }[scheme];

  return colors.map(hslToHex);
}
