import { OperationError } from "../../errors.ts";
import { normalizeAssetPath } from "../../styles/asset-path.ts";
import { findDuplicatePaths } from "../../styles/style-index.ts";
import type { ColorStyleHandle, TextStyleData } from "../../types/framer-port.ts";
import type { StyleRef } from "../../types/styles.ts";
import type {
  ColorInput,
  FontInput,
  ResolvedColor,
  ResolvedFont,
  TextStyleChanges,
  TextStyleContext,
  TextStyleCreate,
  TextStyleInput,
  TextStylePlan,
  TextStyleUpdate,
} from "../../types/text-styles.ts";
import { normalizeColor } from "../../utils/color.ts";
import { assertFontVariant, findFontFamily } from "../fonts/font-catalog.ts";
import { effectiveOverrides } from "./breakpoints.ts";

export function normalizeTextStyles(styles: readonly TextStyleInput[]): TextStyleInput[] {
  const normalized = styles.map((style) => ({
    ...style,
    path: normalizeAssetPath(style.path),
  }));
  const duplicates = findDuplicatePaths(normalized.map((style) => style.path));

  if (duplicates.length > 0) {
    throw new OperationError("DUPLICATE_PATH", `Duplicate style paths in one request: ${duplicates.join(", ")}.`);
  }

  return normalized;
}

/** Resolves fonts and tokens for the whole batch and sorts it into creates, updates and unchanged styles. */
export function planTextStyles(styles: readonly TextStyleInput[], context: TextStyleContext): TextStylePlan {
  const creates: TextStyleCreate[] = [];
  const updates: TextStyleUpdate[] = [];
  const unchanged: StyleRef[] = [];

  for (const style of styles) {
    const current = context.existing.get(style.path);
    const changes = resolveChanges(style, current, context);

    if (current === undefined) {
      creates.push({
        path: style.path,
        changes,
      });
    } else if (hasChanges(changes)) {
      updates.push({
        path: style.path,
        style: current,
        changes,
      });
    } else {
      unchanged.push({
        path: style.path,
        id: current.id,
      });
    }
  }

  return {
    creates,
    updates,
    unchanged,
  };
}

function resolveChanges(
  { path, font, color, breakpoints, ...plain }: TextStyleInput,
  current: TextStyleData | undefined,
  context: TextStyleContext,
): TextStyleChanges {
  return {
    plain,
    font: font === undefined ? undefined : resolveFont(font, current, context),
    color: color === undefined ? undefined : resolveColor(color, context.tokens),
    breakpoints: effectiveOverrides(breakpoints),
  };
}

/**
 * New styles start at 400 normal; updates keep the current weight and style unless the input sets them. A family the
 * library lacks counts as uploaded to the project (getFonts() never lists those): it is written as asked and checked
 * after the write.
 */
function resolveFont(font: FontInput, current: TextStyleData | undefined, context: TextStyleContext): ResolvedFont {
  const weight = font.weight ?? current?.font.weight ?? 400;
  const style = font.style ?? current?.font.style ?? "normal";
  const library = findFontFamily(context.fonts, font.family);

  if (library === undefined) {
    return {
      family: findFontFamily(context.uploadedFonts, font.family) ?? font.family.trim(),
      weight,
      style,
      uploaded: true,
    };
  }

  assertFontVariant(context.fonts, library, weight, style);

  return {
    family: library,
    weight,
    style,
    uploaded: false,
  };
}

function resolveColor(color: ColorInput, tokens: ReadonlyMap<string, ColorStyleHandle>): ResolvedColor {
  if (color.token !== undefined && color.value === undefined) {
    return { token: findToken(tokens, color.token) };
  }

  if (color.value !== undefined && color.token === undefined) {
    return { value: normalizeColor(color.value) };
  }

  throw new OperationError("INVALID_COLOR", "Text color needs exactly one of token or value.");
}

function findToken(tokens: ReadonlyMap<string, ColorStyleHandle>, path: string): ColorStyleHandle {
  const token = tokens.get(normalizeAssetPath(path));

  if (token === undefined) {
    throw new OperationError(
      "TOKEN_NOT_FOUND",
      `Color token "${path}" does not exist.`,
      "Create it with color_tokens_upsert first.",
    );
  }

  return token;
}

function hasChanges({ plain, font, color, breakpoints }: TextStyleChanges): boolean {
  const plainChanges = Object.values(plain).some((value) => value !== undefined);

  return plainChanges || font !== undefined || color !== undefined || Object.keys(breakpoints).length > 0;
}
