import * as z from "zod";
import {
  FIND_LIMIT,
  FIND_LIMIT_MAX,
  FIND_TEXT_MAX,
  LAYOUT_TEMPLATE_TYPE,
  WALK_CONCURRENCY,
} from "../../constants/nodes.ts";
import { OperationError } from "../../errors.ts";
import { serializedList } from "../../history/dsl/serialized.ts";
import { fromPluginNode } from "../../plugin-nodes/attributes.ts";
import { idOf, nameOf, textOf } from "../../plugin-nodes/node-record.ts";
import { pageLayers } from "../../plugin-nodes/walk.ts";
import { FoundLayerSchema } from "../../schemas/site.ts";
import type { FramerRuntime } from "../../types/framer.ts";
import type { FramerPort, WebPageData } from "../../types/framer-port.ts";
import type { FoundLayer, SearchRoot } from "../../types/site.ts";
import { mapInOrder } from "../../utils/async.ts";
import { isPlainObject } from "../../utils/guards.ts";
import { countOf } from "../../utils/text.ts";
import { defineOperation } from "../define.ts";

/** The web pages to look through: one by path, or all of them. */
export async function pagesToSearch(port: FramerPort, pagePath: string | undefined): Promise<WebPageData[]> {
  const pages = (await port.getNodesWithType("WebPageNode")).filter((page) => page.path !== null);

  if (pagePath === undefined) {
    return pages;
  }

  const page = pages.find((candidate) => candidate.path === pagePath);

  if (page === undefined) {
    throw new OperationError(
      "NOT_FOUND",
      `No web page with path "${pagePath}".`,
      "Call project_overview to list pages.",
    );
  }

  return [page];
}

/**
 * What a site-wide search walks: the web pages, and with no page named also the layout templates that hold the shared
 * header and footer (labelled "layout <name>"), which no page's walk reaches.
 */
export async function searchRoots(runtime: FramerRuntime, pagePath: string | undefined): Promise<SearchRoot[]> {
  const pages = (await pagesToSearch(runtime.port, pagePath)).map(({ id, path }) => ({
    id,
    path: path ?? "",
  }));

  return pagePath === undefined ? [...pages, ...(await layoutTemplates(runtime))] : pages;
}

/** The project's layout templates: the Plugin API lists them by type at run time though its types omit it; else the DSL. */
async function layoutTemplates(runtime: FramerRuntime): Promise<SearchRoot[]> {
  const byType = runtime.port.getNodesWithType as unknown as (type: string) => Promise<unknown>;
  const answer: unknown = await byType.call(runtime.port, LAYOUT_TEMPLATE_TYPE).catch(() => null);
  let nodes: readonly unknown[] = Array.isArray(answer) ? answer : [];

  if (nodes.length === 0 && runtime.agent !== null) {
    nodes = serializedList(await runtime.agent.getNodesOfTypes({ types: [LAYOUT_TEMPLATE_TYPE] }).catch(() => []));
  }

  return nodes.flatMap((node) =>
    isPlainObject(node) && typeof node.id === "string"
      ? [
          {
            id: node.id,
            path: `layout ${typeof node.name === "string" ? node.name : node.id}`,
          },
        ]
      : [],
  );
}

export const nodesFind = defineOperation({
  name: "nodes.find",
  effect: "read",
  idempotent: true,
  permissions: [],
  input: z
    .strictObject({
      query: z.string().min(1).exactOptional().describe("Part of a layer's name or text, in any case."),
      type: z
        .string()
        .min(1)
        .exactOptional()
        .describe('Only layers of this type, e.g. "RichTextNode", "FrameNode", "ComponentInstanceNode".'),
      pagePath: z.string().startsWith("/").exactOptional().describe("One page; omit to look through every web page."),
      limit: z.number().int().min(1).max(FIND_LIMIT_MAX).default(FIND_LIMIT),
    })
    .refine(({ query, type }) => query !== undefined || type !== undefined, "Give a query, a type or both."),
  output: z.object({
    matches: z.array(FoundLayerSchema),
    /** More matched than the limit, or the walk stopped on a very large page. */
    truncated: z.boolean(),
  }),
  async run({ runtime }, { query, type, pagePath, limit }) {
    const wanted = query?.toLowerCase();
    const matches: FoundLayer[] = [];
    let complete = true;

    for (const page of await searchRoots(runtime, pagePath)) {
      const { layers, complete: seenAll } = await pageLayers(runtime.port, page.id);
      const wantedLayers = layers.filter(({ node }) => type === undefined || fromPluginNode(node, null).type === type);
      // Texts are read together: one by one, each is a round trip through the Server API.
      const texts = await mapInOrder(wantedLayers, WALK_CONCURRENCY, ({ node }) => textOf(node));

      complete &&= seenAll;
      wantedLayers.forEach(({ node }, index) => {
        const name = nameOf(node);
        const text = texts[index] ?? null;
        const found =
          wanted === undefined ||
          (name?.toLowerCase().includes(wanted) ?? false) ||
          (text?.toLowerCase().includes(wanted) ?? false);

        if (found) {
          matches.push({
            id: idOf(node),
            page: page.path,
            type: fromPluginNode(node, null).type,
            name,
            text: text === null ? null : text.slice(0, FIND_TEXT_MAX),
          });
        }
      });
    }

    return {
      matches: matches.slice(0, limit),
      truncated: !complete || matches.length > limit,
    };
  },
  describe({ query, type }, { matches }) {
    return {
      subject: [query === undefined ? null : `“${query}”`, type ?? null].filter((part) => part !== null).join(" · "),
      summary: countOf(matches.length, "layer"),
    };
  },
});
