import { SLOT_LABELS_BY_REPLICAS } from "../../constants/text-styles.ts";
import { OperationError } from "../../errors.ts";
import type { TextStyleBreakpointData, TextStyleData } from "../../types/framer-port.ts";
import type { BreakpointLabel, PluginApiSlots, SlotValues } from "../../types/text-styles.ts";

// How the Plugin API holds a text style's breakpoint slots (spikes 14 and 15, 30.09.2026). The DSL shows each slot with
// the width it starts at: on a site of 1440/1280/810/390, a style with three slots has default 1440, medium 1280,
// small 810 and extraSmall 0. The Plugin API files each slot's values under the width where the next wider slot starts,
// [1440 → medium, 1280 → small, 810 → extraSmall], and keeps where the narrowest starts (always 0) as the style's own
// minWidth: the widths are shifted by one, whatever @framer/plugin's JSDoc says.

/** The labels of a style's breakpoint slots, widest first, when it has `count` of them. */
export function slotLabels(count: number): readonly BreakpointLabel[] {
  return SLOT_LABELS_BY_REPLICAS[count] ?? [];
}

/** A text style's slots as pages use them, widest first: the base style, then its breakpoints, each where it starts. */
export function slotsOf(style: TextStyleData): TextStyleBreakpointData[] {
  const starts = [...style.breakpoints.map(({ minWidth }) => minWidth), style.minWidth];

  return [
    {
      ...valuesOf(style),
      minWidth: starts[0] ?? style.minWidth,
    },
    ...style.breakpoints.map((breakpoint, index) => ({
      ...valuesOf(breakpoint),
      minWidth: starts[index + 1] ?? 0,
    })),
  ];
}

/** A style's breakpoint slots by label, with what each one sets. */
export function slotsByLabel(style: TextStyleData | undefined): Map<BreakpointLabel, SlotValues> {
  const breakpoints = style?.breakpoints ?? [];
  const labels = slotLabels(breakpoints.length);

  return new Map(
    breakpoints.flatMap((breakpoint, index) => {
      const label = labels[index];

      return label === undefined ? [] : [[label, valuesOf(breakpoint)] as const];
    }),
  );
}

/**
 * A style's breakpoints in the Plugin API's form once its slots are `slots`, whose labels must be the ones a style with
 * that many slots has (slotLabels). A slot the style has keeps the width it is filed under; a new one takes the site's
 * page breakpoint at its place, as the DSL does. `siteWidths`: siteBreakpointWidths.
 */
export function pluginApiSlots(
  path: string,
  current: TextStyleData | undefined,
  slots: ReadonlyMap<BreakpointLabel, SlotValues>,
  siteWidths: readonly number[],
): PluginApiSlots {
  const labels = slotLabels(slots.size);
  const widths = slotWidths(path, labels.length, current?.breakpoints ?? [], siteWidths);

  return {
    minWidth: 0,
    breakpoints: labels.map((label, index) => ({
      ...slots.get(label),
      minWidth: widths[index] ?? 0,
    })),
  };
}

/** The widths `count` slots are filed under: the ones the style has, then the site's; in order, or the call fails. */
function slotWidths(
  path: string,
  count: number,
  kept: readonly TextStyleBreakpointData[],
  siteWidths: readonly number[],
): number[] {
  const widths = Array.from({ length: count }, (_, index) => kept[index]?.minWidth ?? siteWidths[index]);

  if (widths.some((width) => width === undefined)) {
    throw new OperationError(
      "INVALID_INPUT",
      `Text style "${path}" would have ${count} breakpoint slots, but the site has ${siteWidths.length} page breakpoints: each slot starts at one of them.`,
      "Use fewer slots, or add page breakpoints first.",
    );
  }

  const known = widths.filter((width) => width !== undefined);

  if (known.some((width, index) => width <= 0 || (index > 0 && width >= (known[index - 1] ?? 0)))) {
    throw new OperationError(
      "INVALID_INPUT",
      `The breakpoint slots of "${path}" would not start in order (${known.join(", ")} px): its own slots do not follow the page breakpoints.`,
      "Change its breakpoints in Framer, or recreate the style.",
    );
  }

  return known;
}

/** A slot's sizes without where it starts. */
function valuesOf(values: Omit<TextStyleBreakpointData, "minWidth">): Omit<TextStyleBreakpointData, "minWidth"> {
  return {
    fontSize: values.fontSize,
    letterSpacing: values.letterSpacing,
    lineHeight: values.lineHeight,
    paragraphSpacing: values.paragraphSpacing,
  };
}
