import {
  LINK_STATE_PREFIXES,
  LINK_STYLE_FIELDS,
  LINK_STYLE_NODE_TYPE,
  LINK_TRANSITION,
} from "../constants/link-styles.ts";
import { requireAgent } from "../framer/runtime.ts";
import { attributesOf, serializedList } from "../history/dsl/serialized.ts";
import { LinkStateOutputSchema } from "../schemas/link-styles.ts";
import type { FramerRuntime } from "../types/framer.ts";
import type { ColorStyleData } from "../types/framer-port.ts";
import type { LinkStateOutput, LinkStyleData, LinkStyleOutput } from "../types/link-styles.ts";
import { tokenIdsIn } from "../utils/link-styles.ts";
import { normalizeAssetPath } from "./asset-path.ts";

/**
 * The project's link styles as the DSL lists them (the Plugin API has none): each with its canonical path and its
 * attributes as dotted DSL keys, `link.hover.textColor` and so on.
 */
export async function readLinkStyles(runtime: FramerRuntime): Promise<LinkStyleData[]> {
  const listed = await requireAgent(runtime).getNodesOfTypes({ types: [LINK_STYLE_NODE_TYPE] });

  return serializedList(listed).flatMap((node) => {
    const name = node.name?.trim() ?? "";

    return node.type !== LINK_STYLE_NODE_TYPE || name === ""
      ? []
      : [
          {
            id: node.id,
            path: normalizeAssetPath(name),
            attributes: attributesOf(node),
          },
        ];
  });
}

/** A link style as tools show it: each state's values by field, colors with the token they bind. */
export function toLinkStyleOutput(style: LinkStyleData, tokens: readonly ColorStyleData[]): LinkStyleOutput {
  const transition = style.attributes[LINK_TRANSITION];

  return {
    id: style.id,
    path: style.path,
    ...stateOutput(style, LINK_STATE_PREFIXES.base, tokens),
    hover: stateOutput(style, LINK_STATE_PREFIXES.hover, tokens),
    current: stateOutput(style, LINK_STATE_PREFIXES.current, tokens),
    transition: typeof transition === "string" ? transition : null,
  };
}

function stateOutput(style: LinkStyleData, prefix: string, tokens: readonly ColorStyleData[]): LinkStateOutput {
  const output: Record<string, unknown> = {};

  for (const [field, attribute] of LINK_STYLE_FIELDS) {
    const value = style.attributes[`${prefix}.${attribute}`];

    if (value !== undefined && value !== null) {
      output[field] = attribute.endsWith("Color") ? colorOutput(String(value), tokens) : String(value);
    }
  }

  return LinkStateOutputSchema.parse(output);
}

/** A color as the token path it binds and the light value it draws; a token that is gone keeps its reference. */
function colorOutput(value: string, tokens: readonly ColorStyleData[]): { token: string | null; value: string } {
  const [id] = tokenIdsIn(value);
  const token = id === undefined ? undefined : tokens.find((candidate) => candidate.id === id);

  return token === undefined
    ? {
        token: null,
        value,
      }
    : {
        token: normalizeAssetPath(token.path),
        value: token.light,
      };
}
