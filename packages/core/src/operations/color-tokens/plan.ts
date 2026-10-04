import { OperationError } from "../../errors.ts";
import { normalizeAssetPath } from "../../styles/asset-path.ts";
import { findDuplicatePaths } from "../../styles/style-index.ts";
import type { ColorTokenInput, ColorTokenPlan, NormalizedToken, TokenUpdate } from "../../types/color-tokens.ts";
import type { ColorStyleHandle } from "../../types/framer-port.ts";
import type { StyleRef } from "../../types/styles.ts";
import { normalizeColor, sameColor } from "../../utils/color.ts";

export function normalizeTokens(tokens: readonly ColorTokenInput[]): NormalizedToken[] {
  const normalized = tokens.map((token) => ({
    path: normalizeAssetPath(token.path),
    light: normalizeColor(token.light),
    dark: token.dark === undefined || token.dark === null ? token.dark : normalizeColor(token.dark),
  }));
  const duplicates = findDuplicatePaths(normalized.map((token) => token.path));

  if (duplicates.length > 0) {
    throw new OperationError("DUPLICATE_PATH", `Duplicate token paths in one request: ${duplicates.join(", ")}.`);
  }

  return normalized;
}

export function planColorTokens(
  tokens: readonly NormalizedToken[],
  existing: ReadonlyMap<string, ColorStyleHandle>,
): ColorTokenPlan {
  const creates: NormalizedToken[] = [];
  const updates: TokenUpdate[] = [];
  const unchanged: StyleRef[] = [];

  for (const token of tokens) {
    const style = existing.get(token.path);

    if (style === undefined) {
      creates.push(token);
      continue;
    }

    const update = changedChannels(token, style);

    if (update === undefined) {
      unchanged.push({
        path: token.path,
        id: style.id,
      });
    } else {
      updates.push(update);
    }
  }

  return {
    creates,
    updates,
    unchanged,
  };
}

function changedChannels(token: NormalizedToken, style: ColorStyleHandle): TokenUpdate | undefined {
  const lightChanged = !sameColor(style.light, token.light);
  const darkChanged = token.dark !== undefined && !sameDark(style.dark, token.dark);

  if (!lightChanged && !darkChanged) {
    return undefined;
  }

  return {
    path: token.path,
    style,
    light: lightChanged ? token.light : undefined,
    dark: darkChanged ? token.dark : undefined,
  };
}

function sameDark(current: string | null, wanted: string | null): boolean {
  if (current === null || wanted === null) {
    return current === wanted;
  }

  return sameColor(current, wanted);
}
