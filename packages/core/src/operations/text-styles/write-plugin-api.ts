import { PLUGIN_API_ALIGNMENTS } from "../../constants/text-styles.ts";
import { OperationError } from "../../errors.ts";
import { runPluginApiWrites } from "../../styles/plugin-api-batch.ts";
import { unsentOutcome } from "../../styles/style-refs.ts";
import type { FramerRuntime } from "../../types/framer.ts";
import type { ColorStyleData, FontData, FramerPort, TextStyleData, TextStyleFields } from "../../types/framer-port.ts";
import type { CreatedStyle, PluginApiWrite, StyleWriteOptions, StyleWriteOutcome } from "../../types/styles.ts";
import type { ResolvedColor, ResolvedFont, TextStyleCreate, TextStylePlan } from "../../types/text-styles.ts";
import { pluginApiBreakpoints } from "./breakpoints.ts";
import { siteBreakpointWidths } from "./site-breakpoints.ts";

/**
 * createTextStyle for new styles and setAttributes for the rest. The whole batch is prepared first
 * (font handles, breakpoints), so a bad style fails the call before anything is written. New breakpoint slots start at
 * the site's page breakpoints, read once when a style sets any.
 */
export async function writeTextStylesWithPluginApi(
  runtime: FramerRuntime,
  plan: TextStylePlan,
  { dryRun }: StyleWriteOptions,
): Promise<StyleWriteOutcome> {
  const { port } = runtime;
  const setsBreakpoints = [...plan.creates, ...plan.updates].some(
    ({ changes }) => Object.keys(changes.breakpoints).length > 0,
  );
  const siteWidths = setsBreakpoints ? await siteBreakpointWidths(port) : [];
  const creates = await Promise.all(
    plan.creates.map(async (create) => ({
      ...create,
      fields: await prepareFields(port, create, siteWidths),
    })),
  );
  const updates = await Promise.all(
    plan.updates.map(async (update) => ({
      ...update,
      fields: await prepareFields(port, update, siteWidths, update.style),
    })),
  );

  if (dryRun) {
    return unsentOutcome(creates, "");
  }

  const created: CreatedStyle[] = [];
  const writes = [
    ...creates.map(
      ({ path, fields }): PluginApiWrite => ({
        action: "create",
        path,
        run: async () => {
          const style = await port.createTextStyle({
            path,
            ...fields,
            tag: fields.tag ?? "p",
          });

          created.push({
            path,
            id: style.id,
          });
        },
      }),
    ),
    ...updates.map(
      ({ path, style, fields }): PluginApiWrite => ({
        action: "update",
        path,
        run: () => style.setAttributes(fields),
      }),
    ),
  ];

  await runPluginApiWrites(writes, "text_styles_list");

  return {
    created,
    dsl: "",
    diagnostics: null,
  };
}

/** Plugin API attributes for one style; `current` is the style an update changes. */
async function prepareFields(
  port: FramerPort,
  { path, changes }: TextStyleCreate,
  siteWidths: readonly number[],
  current?: TextStyleData,
): Promise<TextStyleFields> {
  const { alignment, ...plain } = changes.plain;
  const baseFontSize = plain.fontSize ?? current?.fontSize;
  const slots = pluginApiBreakpoints(path, changes.breakpoints, current, siteWidths, baseFontSize);

  return {
    ...plain,
    ...(alignment === undefined ? {} : { alignment: PLUGIN_API_ALIGNMENTS[alignment] }),
    ...(changes.font === undefined ? {} : { font: await fontHandle(port, changes.font) }),
    ...(changes.color === undefined ? {} : { color: colorField(changes.color) }),
    ...(slots === undefined
      ? {}
      : {
          minWidth: slots.minWidth,
          breakpoints: slots.breakpoints,
        }),
  };
}

async function fontHandle(port: FramerPort, font: ResolvedFont): Promise<FontData> {
  const handle = await port.getFont(font.family, {
    weight: font.weight,
    style: font.style,
  });

  if (handle === null) {
    throw new OperationError(
      "FONT_NOT_FOUND",
      `"${font.family}" ${font.weight} ${font.style} is not available.`,
      font.uploaded
        ? 'A font uploaded to the project is set through the DSL: pass via "dsl" (the Server API).'
        : undefined,
    );
  }

  return handle;
}

function colorField(color: ResolvedColor): ColorStyleData | string {
  return "token" in color ? color.token : color.value;
}
