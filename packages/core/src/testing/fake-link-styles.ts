import { TOKEN_REFERENCE } from "../constants/history.ts";
import {
  FRAMER_LINK_BLUE,
  LINK_STYLE_FIELDS,
  LINK_STYLE_NODE_TYPE,
  LINK_TRANSITION,
  LINK_UNSTORED_VALUES,
} from "../constants/link-styles.ts";
import type { FakeFramerState, FakeLayer, FakeLinkStyle } from "../types/testing.ts";
import { expandBox } from "../utils/link-styles.ts";
import { FakeCommandError } from "./fake-node-attributes.ts";

/** The attributes a link style takes, as Framer lists them: every field in each state, and the transition. */
const LINK_ATTRIBUTES: ReadonlySet<string> = new Set([
  ...["link", "link.hover", "link.current"].flatMap((prefix) =>
    [...LINK_STYLE_FIELDS.map(([, attribute]) => attribute), "textDecorationSkipInk", "textBackgroundCornerShape"].map(
      (field) => `${prefix}.${field}`,
    ),
  ),
  LINK_TRANSITION,
]);

/** Like Framer: a new link style without a color is drawn in its default blue. */
export function newLinkStyle(id: string, name: string, attributes: Readonly<Record<string, string>>): FakeLinkStyle {
  return withLinkAttributes(
    {
      id,
      name,
      attributes: { "link.textColor": FRAMER_LINK_BLUE },
    },
    attributes,
  );
}

/** A link style with DSL attributes applied: "null" removes one, and the transition takes only a tween. */
export function withLinkAttributes(style: FakeLinkStyle, attributes: Readonly<Record<string, string>>): FakeLinkStyle {
  const next = { ...style.attributes };

  for (const [key, value] of Object.entries(attributes)) {
    if (!LINK_ATTRIBUTES.has(key)) {
      throw new FakeCommandError(`Unknown attribute \`${key}\` on ${LINK_STYLE_NODE_TYPE}.`);
    }

    if (key === LINK_TRANSITION && value !== "null" && !value.startsWith("tween ")) {
      throw new FakeCommandError(
        `Invalid value \`${key}="${value}"\`. Assertion Error: Unsupported transition type: ${value.split(" ")[0]}.`,
      );
    }

    // Like Framer: a value every link has anyway is not stored, and radius and padding are spelled out.
    const stored = /\.textBackground(?:Radius|Padding)$/.test(key) ? expandBox(value) : value;

    if (value === "null" || LINK_UNSTORED_VALUES.get(key.split(".").at(-1) ?? "") === stored) {
      delete next[key];
    } else {
      next[key] = stored;
    }
  }

  return {
    ...style,
    attributes: next,
  };
}

/** A link style as getNodesOfTypes lists it: attributes nested by state, as serialize() reports effects. */
export function linkStyleNode(style: FakeLinkStyle) {
  const attributes: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(style.attributes)) {
    const path = key.split(".");
    const leaf = path.pop() ?? key;
    let level = attributes;

    for (const part of path) {
      level[part] ??= {};
      level = level[part] as Record<string, unknown>;
    }

    level[leaf] = value;
  }

  return {
    type: LINK_STYLE_NODE_TYPE,
    name: style.name,
    id: style.id,
    attributes,
  };
}

/** Framer refuses to delete a link style text still uses. */
export function assertLinkStyleUnused(state: FakeFramerState, style: FakeLinkStyle): void {
  const used = Object.values(state.layers)
    .flat()
    .some((layer) => [style.id, style.name].includes(String(attributesOf(layer).linkStylePreset)));

  if (used) {
    throw new FakeCommandError("Cannot complete `DEL`: Cannot remove node because `RichTextNode` nodes still use it.");
  }
}

/** The tokens and styles the layers use, each once, as getDescendantReferencesOfTypes lists them. */
export function referencedStyles(state: FakeFramerState, layers: readonly FakeLayer[]) {
  const nodes = new Map<string, { type: string; id: string; name: string }>();
  const byName = (name: unknown, path: string) => name === path.replace(/^\/+/, "");

  for (const layer of layers) {
    const attributes = attributesOf(layer);

    for (const [, id] of JSON.stringify(attributes).matchAll(TOKEN_REFERENCE)) {
      const token = state.colorStyles.find((candidate) => candidate.id === id);

      if (token !== undefined) {
        nodes.set(token.id, {
          type: "ColorStyleTokenNode",
          id: token.id,
          name: token.name,
        });
      }
    }

    const text = state.textStyles.find(
      (style) => style.id === attributes.textStylePreset || byName(attributes.textStylePreset, style.path),
    );
    const link = state.linkStyles.find((style) => [style.id, style.name].includes(String(attributes.linkStylePreset)));

    if (text !== undefined) {
      nodes.set(text.id, {
        type: "TextStylePresetNode",
        id: text.id,
        name: text.path.replace(/^\/+/, ""),
      });
    }

    if (link !== undefined) {
      nodes.set(link.id, {
        type: LINK_STYLE_NODE_TYPE,
        id: link.id,
        name: link.name,
      });
    }
  }

  return [...nodes.values()];
}

function attributesOf(layer: FakeLayer): Record<string, unknown> {
  const { attributes } = layer;

  return typeof attributes === "object" && attributes !== null ? (attributes as Record<string, unknown>) : {};
}
