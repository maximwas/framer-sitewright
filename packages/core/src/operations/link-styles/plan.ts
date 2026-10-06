import {
  FRAMER_LINK_BLUE,
  LINK_STATE_PREFIXES,
  LINK_STYLE_FIELDS,
  LINK_TRANSITION,
} from "../../constants/link-styles.ts";
import { tokenRef } from "../../dsl/commands.ts";
import { OperationError } from "../../errors.ts";
import { normalizeAssetPath } from "../../styles/asset-path.ts";
import { findDuplicatePaths } from "../../styles/style-index.ts";
import type { DslValue } from "../../types/dsl.ts";
import type { ColorStyleData } from "../../types/framer-port.ts";
import type {
  LinkStateInput,
  LinkStyleCreate,
  LinkStyleData,
  LinkStyleField,
  LinkStyleInput,
  LinkStylePlan,
  LinkStyleUpdate,
} from "../../types/link-styles.ts";
import type { StyleRef } from "../../types/styles.ts";
import type { ColorInput } from "../../types/text-styles.ts";
import { normalizeColor } from "../../utils/color.ts";
import { sameLinkValue, tokenIdsIn } from "../../utils/link-styles.ts";

export function normalizeLinkStyles(styles: readonly LinkStyleInput[]): LinkStyleInput[] {
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

/**
 * Sorts the batch into creates, updates (only the attributes that change) and unchanged styles. A new style needs a
 * color: without one Framer draws its links in its default blue, the very thing a link style is there to fix.
 */
export function planLinkStyles(
  styles: readonly LinkStyleInput[],
  existing: ReadonlyMap<string, LinkStyleData>,
  tokens: readonly ColorStyleData[],
): LinkStylePlan {
  const creates: LinkStyleCreate[] = [];
  const updates: LinkStyleUpdate[] = [];
  const unchanged: StyleRef[] = [];

  for (const style of styles) {
    const wanted = wantedAttributes(style, tokens);
    const current = existing.get(style.path);

    if (current === undefined) {
      creates.push(newStyle(style.path, wanted));
      continue;
    }

    const changes = Object.fromEntries(
      Object.entries(wanted).filter(([key, value]) => !sameLinkValue(key, value, current.attributes[key])),
    );

    if (Object.keys(changes).length === 0) {
      unchanged.push({
        path: style.path,
        id: current.id,
      });
    } else {
      updates.push({
        path: style.path,
        style: current,
        attributes: changes,
      });
    }
  }

  return {
    creates,
    updates,
    unchanged,
  };
}

function newStyle(path: string, wanted: Readonly<Record<string, DslValue>>): LinkStyleCreate {
  if ((wanted[`${LINK_STATE_PREFIXES.base}.textColor`] ?? null) === null) {
    throw new OperationError(
      "INVALID_INPUT",
      `A new link style needs color: Framer would draw "${path}" in its default link blue (${FRAMER_LINK_BLUE}).`,
      'Pass color, e.g. { token: "Text/Primary" }.',
    );
  }

  return {
    path,
    attributes: Object.fromEntries(Object.entries(wanted).filter(([, value]) => value !== null)),
  };
}

/** The DSL attributes the input sets, `link.hover.textColor` and so on; null removes one. */
function wantedAttributes(style: LinkStyleInput, tokens: readonly ColorStyleData[]): Record<string, DslValue> {
  return {
    ...stateAttributes(LINK_STATE_PREFIXES.base, style, tokens),
    ...(style.hover === undefined ? {} : stateAttributes(LINK_STATE_PREFIXES.hover, style.hover, tokens)),
    ...(style.current === undefined ? {} : stateAttributes(LINK_STATE_PREFIXES.current, style.current, tokens)),
    ...(style.transition === null ? { [LINK_TRANSITION]: null } : {}),
  };
}

function stateAttributes(
  prefix: string,
  state: LinkStateInput,
  tokens: readonly ColorStyleData[],
): Record<string, DslValue> {
  const color = (input: ColorInput | null | undefined) =>
    input === undefined || input === null ? input : resolveColor(input, tokens);
  const values: Record<LinkStyleField, DslValue | undefined> = {
    color: color(state.color),
    decoration: state.decoration,
    decorationColor: color(state.decorationColor),
    decorationStyle: state.decorationStyle,
    decorationThickness: state.decorationThickness,
    decorationOffset: state.decorationOffset,
    backgroundColor: color(state.backgroundColor),
    backgroundRadius: state.backgroundRadius,
    backgroundPadding: state.backgroundPadding,
  };

  return Object.fromEntries(
    LINK_STYLE_FIELDS.flatMap(([field, attribute]) => {
      const value = values[field];

      return value === undefined ? [] : [[`${prefix}.${attribute}`, value]];
    }),
  );
}

/** A token by path or id as `var(--token-<id>)`, a token reference kept once its token is found, or a CSS color. */
function resolveColor(color: ColorInput, tokens: readonly ColorStyleData[]): string {
  if (color.token !== undefined && color.value === undefined) {
    return tokenRef(findToken(tokens, color.token).id);
  }

  if (color.value !== undefined && color.token === undefined) {
    const [id] = tokenIdsIn(color.value);

    return id === undefined ? normalizeColor(color.value) : tokenRef(findToken(tokens, id).id);
  }

  throw new OperationError("INVALID_COLOR", "A link color needs exactly one of token or value.");
}

function findToken(tokens: readonly ColorStyleData[], reference: string): ColorStyleData {
  const path = normalizeAssetPath(reference);
  const token = tokens.find((candidate) => candidate.id === reference || normalizeAssetPath(candidate.path) === path);

  if (token === undefined) {
    throw new OperationError(
      "TOKEN_NOT_FOUND",
      `Color token "${reference}" does not exist.`,
      "List tokens with color_tokens_list, or create it with color_tokens_upsert first.",
    );
  }

  return token;
}
