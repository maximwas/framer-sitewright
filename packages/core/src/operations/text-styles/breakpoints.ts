import { BREAKPOINT_LABELS, DSL_SLOT_ORDER, MAX_BREAKPOINTS } from "../../constants/text-styles.ts";
import { OperationError } from "../../errors.ts";
import type { DslValue } from "../../types/dsl.ts";
import type { TextStyleData } from "../../types/framer-port.ts";
import type {
  BreakpointLabel,
  BreakpointOverride,
  BreakpointOverrides,
  PluginApiSlots,
  SlotValues,
  TextStyleInput,
} from "../../types/text-styles.ts";
import { pluginApiSlots, slotLabels, slotsByLabel } from "./slots.ts";

/** Overrides that change something: a label given without sizes is left out. */
export function effectiveOverrides(breakpoints: TextStyleInput["breakpoints"]): BreakpointOverrides {
  const effective: BreakpointOverrides = {};

  for (const label of BREAKPOINT_LABELS) {
    const override = breakpoints?.[label];

    if (override !== undefined && changesSomething(override)) {
      effective[label] = override;
    }
  }

  return effective;
}

function changesSomething({ fontSize, lineHeight, letterSpacing, paragraphSpacing }: BreakpointOverride): boolean {
  return [fontSize, lineHeight, letterSpacing, paragraphSpacing].some((value) => value !== undefined);
}

/**
 * The DSL adds slots in order and refuses `small` or `extraSmall` while the earlier ones are missing. A slot the input
 * skips and the style lacks gets the base font size: it exists then, and shows the same as inheriting would.
 * `existingSlots`: how many of medium, small, extraSmall the style already has.
 */
export function withEarlierSlots(
  path: string,
  overrides: BreakpointOverrides,
  existingSlots: number,
  baseFontSize: string | undefined,
): BreakpointOverrides {
  const last = DSL_SLOT_ORDER.findLastIndex((label) => overrides[label] !== undefined);
  const missing =
    last === -1 ? [] : DSL_SLOT_ORDER.slice(existingSlots, last).filter((label) => overrides[label] === undefined);

  if (missing.length === 0) {
    return overrides;
  }

  if (baseFontSize === undefined) {
    throw new OperationError(
      "INVALID_INPUT",
      `Text style "${path}" sets breakpoint "${DSL_SLOT_ORDER[last]}" without ${missing.join(" and ")}.`,
      "Framer adds breakpoint slots in order (medium, small, extraSmall): give the earlier ones too, or a fontSize.",
    );
  }

  return {
    ...overrides,
    ...Object.fromEntries(missing.map((label) => [label, { fontSize: baseFontSize }])),
  };
}

/** `breakpoint.<label>.<field>` DSL attributes for the given slots, in slot order. */
export function dslBreakpointAttributes(
  overrides: BreakpointOverrides,
  labels: readonly BreakpointLabel[],
): Record<string, DslValue | undefined> {
  const attributes: Record<string, DslValue | undefined> = {};

  for (const label of labels) {
    const override = overrides[label];

    if (override === undefined) {
      continue;
    }

    attributes[`breakpoint.${label}.fontSize`] = override.fontSize;
    attributes[`breakpoint.${label}.lineHeight`] = override.lineHeight;
    attributes[`breakpoint.${label}.letterSpacing`] = override.letterSpacing;
    attributes[`breakpoint.${label}.paragraphSpacing`] = pixels(override.paragraphSpacing);
  }

  return attributes;
}

/**
 * The Plugin API write for a style's breakpoint overrides, or undefined when there are none. They go into the style's
 * current slots by label, as in the DSL; a slot added on the way (an earlier label, or all four with `large`) gets
 * `baseFontSize`, the style's size after the write. setAttributes replaces the whole list, so it is written whole.
 */
export function pluginApiBreakpoints(
  path: string,
  overrides: BreakpointOverrides,
  current: TextStyleData | undefined,
  siteWidths: readonly number[],
  baseFontSize: string | undefined,
): PluginApiSlots | undefined {
  const requested = BREAKPOINT_LABELS.filter((label) => overrides[label] !== undefined);

  if (requested.length === 0) {
    return undefined;
  }

  const existing = slotsByLabel(current);
  const labels = labelsWith([...existing.keys(), ...requested]);
  const slots = new Map(
    labels.map(
      (label) => [label, slotAfterWrite(path, label, existing.get(label), overrides[label], baseFontSize)] as const,
    ),
  );

  return pluginApiSlots(path, current, slots, siteWidths);
}

/** The labels a style has once it holds these: every earlier one too (the DSL adds slots in order), all four with large. */
function labelsWith(present: readonly BreakpointLabel[]): readonly BreakpointLabel[] {
  if (present.includes("large")) {
    return slotLabels(MAX_BREAKPOINTS);
  }

  return slotLabels(DSL_SLOT_ORDER.findLastIndex((label) => present.includes(label)) + 1);
}

/** A slot after the write: the override on what it had; a slot added on the way has the base size. */
function slotAfterWrite(
  path: string,
  label: BreakpointLabel,
  existing: SlotValues | undefined,
  override: BreakpointOverride | undefined,
  baseFontSize: string | undefined,
): SlotValues {
  if (existing !== undefined || override !== undefined) {
    return {
      ...existing,
      ...override,
    };
  }

  if (baseFontSize === undefined) {
    throw new OperationError(
      "INVALID_INPUT",
      `Text style "${path}" needs a "${label}" slot before the ones it sets.`,
      "Framer adds breakpoint slots in order (medium, small, extraSmall; large makes four): give that one too, or a fontSize.",
    );
  }

  return { fontSize: baseFontSize };
}

/** Breakpoint paragraph spacing is `<number>px` in the DSL grammar, unlike the style's own bare number. */
function pixels(value: number | undefined): string | undefined {
  return value === undefined ? undefined : `${value}px`;
}
