import { addNode, setNode, tokenRef } from "../../dsl/commands.ts";
import { nextTempId } from "../../dsl/temp-ids.ts";
import { applyDslBatch } from "../../styles/dsl-batch.ts";
import type { DslAttributes } from "../../types/dsl.ts";
import type { FramerRuntime } from "../../types/framer.ts";
import type { StyleWriteOptions, StyleWriteOutcome } from "../../types/styles.ts";
import type { ResolvedColor, ResolvedFont, TextStyleChanges, TextStylePlan } from "../../types/text-styles.ts";
import { dslBreakpointAttributes, withEarlierSlots } from "./breakpoints.ts";

/**
 * One applyChanges call: `+TextStylePresetNode` for new styles, `SET` for the rest. Adding the `large`
 * slot makes Framer relabel the other slots, so `breakpoint.large.*` goes in its own SET afterwards.
 */
export function writeTextStylesWithDsl(
  runtime: FramerRuntime,
  plan: TextStylePlan,
  { dryRun }: StyleWriteOptions,
): Promise<StyleWriteOutcome> {
  const creates = plan.creates.map((create) => ({
    ...create,
    tempId: nextTempId(runtime, "style"),
    changes: withSlots(create.path, create.changes, 0, create.changes.plain.fontSize),
  }));
  const updates = plan.updates.map((update) => ({
    ...update,
    changes: withSlots(
      update.path,
      update.changes,
      update.style.breakpoints.length,
      update.changes.plain.fontSize ?? update.style.fontSize,
    ),
  }));
  const commands = [
    ...creates.flatMap(({ path, tempId, changes }) => [
      addNode("TextStylePresetNode", tempId, {
        name: path,
        tag: changes.plain.tag ?? "p",
        ...styleAttributes(changes),
      }),
      ...largeBreakpointCommands(tempId, changes),
    ]),
    ...updates.flatMap(({ style, changes }) => [
      ...setCommands(style.id, {
        tag: changes.plain.tag,
        ...styleAttributes(changes),
      }),
      ...largeBreakpointCommands(style.id, changes),
    ]),
  ];

  return applyDslBatch(
    runtime,
    {
      commands,
      creates,
    },
    dryRun,
  );
}

function withSlots(
  path: string,
  changes: TextStyleChanges,
  existingSlots: number,
  baseFontSize: string | undefined,
): TextStyleChanges {
  return {
    ...changes,
    breakpoints: withEarlierSlots(path, changes.breakpoints, existingSlots, baseFontSize),
  };
}

function styleAttributes({ plain, font, color, breakpoints }: TextStyleChanges): DslAttributes {
  return {
    fontSize: plain.fontSize,
    lineHeight: plain.lineHeight,
    letterSpacing: plain.letterSpacing,
    paragraphSpacing: plain.paragraphSpacing,
    textTransform: plain.transform,
    textAlignment: plain.alignment,
    textDecoration: plain.decoration,
    textWrap: plain.balance === undefined ? undefined : plain.balance ? "balance" : null,
    ...fontAttributes(font),
    textColor: color === undefined ? undefined : colorValue(color),
    ...dslBreakpointAttributes(breakpoints, ["medium", "small", "extraSmall"]),
  };
}

function fontAttributes(font: ResolvedFont | undefined): DslAttributes {
  return font === undefined
    ? {}
    : {
        fontName: font.family,
        fontWeight: font.weight,
        fontStyle: font.style,
      };
}

function colorValue(color: ResolvedColor): string {
  return "token" in color ? tokenRef(color.token.id) : color.value;
}

function largeBreakpointCommands(id: string, { breakpoints }: TextStyleChanges): string[] {
  return setCommands(id, dslBreakpointAttributes(breakpoints, ["large"]));
}

/** A SET for the attributes that have a value; none when nothing changes. */
function setCommands(id: string, attributes: DslAttributes): string[] {
  return Object.values(attributes).some((value) => value !== undefined) ? [setNode(id, attributes)] : [];
}
