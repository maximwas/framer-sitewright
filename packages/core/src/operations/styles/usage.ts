import * as z from "zod";
import {
  PAGE_USAGE_NOTE,
  STYLE_REFERENCE_TYPES,
  USAGE_LAYER_TYPES,
  USAGE_SCOPE_KINDS,
} from "../../constants/styles-usage.ts";
import { requireAgent } from "../../framer/runtime.ts";
import { serializedList } from "../../history/dsl/serialized.ts";
import { StylesUsageOutputSchema } from "../../schemas/styles-usage.ts";
import { normalizeAssetPath } from "../../styles/asset-path.ts";
import { readLinkStyles } from "../../styles/link-styles.ts";
import { StyleNames, splitByUse, UsageTally } from "../../styles/usage.ts";
import type { AgentPort, FramerRuntime } from "../../types/framer.ts";
import type { ColorStyleData, TextStyleData } from "../../types/framer-port.ts";
import type { LinkStyleData } from "../../types/link-styles.ts";
import type { ScopeUsage, UsageScope } from "../../types/styles-usage.ts";
import { errorMessage } from "../../utils/errors.ts";
import { tokenIdsIn } from "../../utils/link-styles.ts";
import { countOf } from "../../utils/text.ts";
import { defineOperation } from "../define.ts";
import { pagesToSearch } from "../nodes/find.ts";

export const stylesUsage = defineOperation({
  name: "styles.usage",
  effect: "read",
  idempotent: true,
  permissions: [],
  // Framer's reference lists and the layers' style names come from framer.agent.
  needsAgent: true,
  input: z.strictObject({
    pagePath: z
      .string()
      .startsWith("/")
      .exactOptional()
      .describe("One web page; omit to read the whole site: every page, component, design page and layout."),
  }),
  output: StylesUsageOutputSchema,
  async run({ runtime }, { pagePath }) {
    const agent = requireAgent(runtime);
    const [colors, texts, links, scopes] = await Promise.all([
      runtime.port.getColorStyles(),
      runtime.port.getTextStyles(),
      readLinkStyles(runtime),
      usageScopes(runtime, agent, pagePath),
    ]);
    const tally = new UsageTally(
      new Set(colors.map(({ id }) => id)),
      new StyleNames(texts.map(named)),
      new StyleNames(links),
    );
    const failed: string[] = [];

    // One scope at a time: a page's layers can run to thousands of nodes.
    for (const scope of scopes) {
      try {
        tally.add(await readScope(agent, scope));
      } catch (error) {
        failed.push(`${scope.label} (${errorMessage(error)})`);
      }
    }

    const bound = bindingStyles(texts, links);
    const notes = [
      pagePath === undefined ? null : PAGE_USAGE_NOTE,
      failed.length === 0 ? null : `Could not read ${failed.join("; ")}: a style used only there shows as unused.`,
    ].filter((note) => note !== null);

    return {
      scope: pagePath ?? "site",
      tokens: splitByUse(
        colors.map((token) => ({
          ...tally.usage(named(token)),
          styles: bound.get(token.id) ?? [],
        })),
        (token) => token.layers > 0 || token.usedIn.length > 0 || token.styles.length > 0,
      ),
      textStyles: splitByUse(
        texts.map(named).map((style) => tally.usage(style)),
        inUse,
      ),
      linkStyles: splitByUse(
        links.map((style) => tally.usage(style)),
        inUse,
      ),
      note: notes.length === 0 ? null : notes.join(" "),
    };
  },
  describe({ pagePath }, { tokens, textStyles, linkStyles }) {
    const unused = tokens.unused.length + textStyles.unused.length + linkStyles.unused.length;

    return {
      subject: pagePath ?? "site",
      summary: `${countOf(unused, "unused style")} (tokens, text and link styles)`,
    };
  },
});

function inUse({ layers, usedIn }: { layers: number; usedIn: readonly string[] }): boolean {
  return layers > 0 || usedIn.length > 0;
}

function named(style: ColorStyleData | TextStyleData): { id: string; path: string } {
  return {
    id: style.id,
    path: normalizeAssetPath(style.path),
  };
}

/** The web pages, or the one asked for; for the whole site also every component, design page and layout. */
async function usageScopes(
  runtime: FramerRuntime,
  agent: AgentPort,
  pagePath: string | undefined,
): Promise<UsageScope[]> {
  const pages = (await pagesToSearch(runtime.port, pagePath)).map((page) => ({
    id: page.id,
    label: page.path ?? page.id,
    pagePath: page.path ?? undefined,
  }));

  if (pagePath !== undefined) {
    return pages;
  }

  const others = serializedList(await agent.getNodesOfTypes({ types: [...USAGE_SCOPE_KINDS.keys()] })).flatMap(
    (node) => {
      const kind = USAGE_SCOPE_KINDS.get(node.type);

      return kind === undefined
        ? []
        : [
            {
              id: node.id,
              label: `${kind} ${node.name ?? node.id}`,
              pagePath: undefined,
            },
          ];
    },
  );

  return [...pages, ...others];
}

/** Framer's list of the styles a scope uses, and its layers; a web page is read on its own path. */
async function readScope(agent: AgentPort, { id, label, pagePath }: UsageScope): Promise<ScopeUsage> {
  const options = pagePath === undefined ? {} : { pagePath };
  const [references, layers] = await Promise.all([
    agent.getDescendantReferencesOfTypes(
      {
        id,
        types: STYLE_REFERENCE_TYPES,
      },
      options,
    ),
    agent.getDescendantsOfTypes(
      {
        id,
        types: USAGE_LAYER_TYPES,
      },
      options,
    ),
  ]);

  return {
    label,
    references,
    layers,
  };
}

/** Each token's text and link styles: a text style's color, and any link style value that binds it. */
function bindingStyles(texts: readonly TextStyleData[], links: readonly LinkStyleData[]): Map<string, string[]> {
  const bound = new Map<string, string[]>();
  const bind = (tokenId: string, path: string) => {
    bound.set(tokenId, [...(bound.get(tokenId) ?? []), path]);
  };

  for (const style of texts) {
    if (typeof style.color !== "string") {
      bind(style.color.id, normalizeAssetPath(style.path));
    }
  }

  for (const style of links) {
    for (const tokenId of tokenIdsIn(JSON.stringify(style.attributes))) {
      bind(tokenId, style.path);
    }
  }

  return bound;
}
