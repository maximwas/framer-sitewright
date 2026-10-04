import { FONT_STYLES, FONT_WEIGHTS } from "../constants/fonts.ts";
import { BREAKPOINT_ATTRIBUTE, DSL_ALIGNMENTS } from "../constants/testing.ts";
import { BREAKPOINT_LABELS, TEXT_DECORATIONS, TEXT_STYLE_TAGS, TEXT_TRANSFORMS } from "../constants/text-styles.ts";
import { pluginApiSlots, slotLabels, slotsByLabel } from "../operations/text-styles/slots.ts";
import type { FakeColorStyle, FakeTextStyle, NodeAttributes } from "../types/testing.ts";
import type { SlotValues } from "../types/text-styles.ts";
import { normalizeColor } from "../utils/color.ts";

/** A command the fake cannot apply. applyChanges reports it in `errors`, as Framer does. */
export class FakeCommandError extends Error {}

/** `light` and `dark` of a ColorStyleTokenNode, normalized as Framer stores them. */
export function tokenColors(attributes: NodeAttributes): Partial<Pick<FakeColorStyle, "light" | "dark">> {
  const unknown = Object.keys(attributes).find((key) => key !== "light" && key !== "dark");

  if (unknown !== undefined) {
    throw new FakeCommandError(unknownAttribute(unknown, "ColorStyleTokenNode"));
  }

  const { light, dark } = attributes;

  return {
    ...(light === undefined ? {} : { light: fakeColor(light) }),
    ...(dark === undefined ? {} : { dark: dark === "null" ? null : fakeColor(dark) }),
  };
}

/**
 * A text style with DSL attributes applied. A slot the command creates starts from the new base values. `siteWidths`:
 * the site's page breakpoints, widest first, where new slots start.
 */
export function withTextStyleAttributes(
  style: FakeTextStyle,
  attributes: NodeAttributes,
  findToken: (id: string) => FakeColorStyle | undefined,
  siteWidths: readonly number[],
): FakeTextStyle {
  const next: FakeTextStyle = { ...style };
  const entries = Object.entries(attributes);

  for (const [key, value] of entries) {
    if (!key.startsWith("breakpoint.")) {
      Object.assign(next, textAttribute(next, key, value, findToken));
    }
  }

  for (const [key, value] of entries) {
    if (key.startsWith("breakpoint.")) {
      Object.assign(next, withSlotAttribute(next, key, value, siteWidths));
    }
  }

  return next;
}

function textAttribute(
  style: FakeTextStyle,
  key: string,
  value: string,
  findToken: (id: string) => FakeColorStyle | undefined,
): Partial<FakeTextStyle> {
  switch (key) {
    case "tag":
      return { tag: oneOf(TEXT_STYLE_TAGS, value, key) };
    case "fontName":
      return {
        font: {
          ...style.font,
          family: value,
          selector: `GF;${value}`,
        },
      };
    case "fontWeight":
      return {
        font: {
          ...style.font,
          weight: oneOf(FONT_WEIGHTS, Number(value), key),
        },
      };
    case "fontStyle":
      return {
        font: {
          ...style.font,
          style: oneOf(FONT_STYLES, value, key),
        },
      };
    case "fontSize":
      return { fontSize: value };
    case "lineHeight":
      return { lineHeight: value };
    case "letterSpacing":
      return { letterSpacing: value };
    case "paragraphSpacing":
      return { paragraphSpacing: Number(value) };
    case "textColor":
      return { color: textColor(value, findToken) };
    case "textTransform":
      return { transform: oneOf(TEXT_TRANSFORMS, value, key) };
    case "textAlignment":
      return { alignment: DSL_ALIGNMENTS[value] ?? invalidValue(key, value) };
    case "textDecoration":
      return { decoration: oneOf(TEXT_DECORATIONS, value, key) };
    default:
      throw new FakeCommandError(unknownAttribute(key, "TextStylePresetNode"));
  }
}

/**
 * The style's minWidth and breakpoints after setting one `breakpoint.<label>.<field>`, in the Plugin API's form. Like the
 * DSL, the label names a slot by its place, a new slot must be the next one (medium, small, extraSmall; large makes
 * four) and starts from the base values.
 */
function withSlotAttribute(
  style: FakeTextStyle,
  key: string,
  value: string,
  siteWidths: readonly number[],
): Pick<FakeTextStyle, "minWidth" | "breakpoints"> {
  const [, name = "", field] = BREAKPOINT_ATTRIBUTE.exec(key) ?? [];
  const label = BREAKPOINT_LABELS.find((candidate) => candidate === name);
  const slots = slotsByLabel(style);
  const next = slotLabels(slots.size + 1);

  if (label === undefined) {
    throw new FakeCommandError(unknownAttribute(key, "TextStylePresetNode"));
  }

  if (!slots.has(label) && !(next.includes(label) && [...slots.keys()].every((known) => next.includes(known)))) {
    throw new FakeCommandError(`Cannot add breakpoint slot "${label}": add ${next.join(", ")} in order.`);
  }

  const slot = withSlotField(slots.get(label) ?? baseValues(style), field, value);
  const written = pluginApiSlots(style.path, style, new Map([...slots, [label, slot]]), siteWidths);

  return {
    minWidth: written.minWidth,
    breakpoints: written.breakpoints.map((breakpoint) => ({
      ...baseValues(style),
      ...breakpoint,
    })),
  };
}

function baseValues(style: FakeTextStyle): Required<SlotValues> {
  return {
    fontSize: style.fontSize,
    letterSpacing: style.letterSpacing,
    lineHeight: style.lineHeight,
    paragraphSpacing: style.paragraphSpacing,
  };
}

function withSlotField(slot: SlotValues, field: string | undefined, value: string): SlotValues {
  switch (field) {
    case "fontSize":
      return {
        ...slot,
        fontSize: value,
      };
    case "letterSpacing":
      return {
        ...slot,
        letterSpacing: value,
      };
    case "lineHeight":
      return {
        ...slot,
        lineHeight: value,
      };
    default:
      return {
        ...slot,
        paragraphSpacing: Number.parseFloat(value),
      };
  }
}

function textColor(value: string, findToken: (id: string) => FakeColorStyle | undefined): FakeColorStyle | string {
  const tokenId = /^var\(--token-(.+)\)$/.exec(value)?.[1];

  if (tokenId === undefined) {
    return fakeColor(value);
  }

  const token = findToken(tokenId);

  if (token === undefined) {
    throw new FakeCommandError(`Color token "${tokenId}" does not exist.`);
  }

  return token;
}

function fakeColor(value: string): string {
  try {
    return normalizeColor(value);
  } catch {
    throw new FakeCommandError(`Invalid color "${value}".`);
  }
}

function oneOf<T>(values: readonly T[], value: unknown, key: string): T {
  return values.find((candidate) => candidate === value) ?? invalidValue(key, value);
}

function invalidValue(key: string, value: unknown): never {
  throw new FakeCommandError(`Invalid ${key} "${String(value)}".`);
}

function unknownAttribute(key: string, nodeType: string): string {
  return `Unknown attribute \`${key}\` for ${nodeType} (or not modelled by the fake).`;
}
