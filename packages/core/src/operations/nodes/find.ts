import * as z from "zod";
import { FIND_LIMIT, FIND_LIMIT_MAX, FIND_TEXT_MAX, WALK_CONCURRENCY } from "../../constants/nodes.ts";
import { OperationError } from "../../errors.ts";
import { fromPluginNode } from "../../plugin-nodes/attributes.ts";
import { idOf, nameOf, textOf } from "../../plugin-nodes/node-record.ts";
import { pageLayers } from "../../plugin-nodes/walk.ts";
import { FoundLayerSchema } from "../../schemas/site.ts";
import type { FramerPort, WebPageData } from "../../types/framer-port.ts";
import type { FoundLayer } from "../../types/site.ts";
import { mapInOrder } from "../../utils/async.ts";
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

    for (const page of await pagesToSearch(runtime.port, pagePath)) {
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
            page: page.path ?? "",
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
