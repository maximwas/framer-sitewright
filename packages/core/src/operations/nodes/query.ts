import * as z from "zod";
import { FIND_LIMIT, FIND_LIMIT_MAX, QUERY_CONDITIONS_MAX, QUERY_OPERATORS } from "../../constants/nodes.ts";
import { fromPluginNode } from "../../plugin-nodes/attributes.ts";
import { idOf, nameOf } from "../../plugin-nodes/node-record.ts";
import { pageLayers } from "../../plugin-nodes/walk.ts";
import { meetsCondition } from "../../utils/node-query.ts";
import { countOf } from "../../utils/text.ts";
import { defineOperation } from "../define.ts";
import { pagesToSearch } from "./find.ts";

const MatchSchema = z.object({
  id: z.string(),
  page: z.string(),
  type: z.string(),
  name: z.string().nullable(),
  /** The attributes the conditions name, as the layer has them. */
  attributes: z.record(z.string(), z.string()),
});

export const nodesQuery = defineOperation({
  name: "nodes.query",
  effect: "read",
  idempotent: true,
  permissions: [],
  input: z.strictObject({
    where: z
      .array(
        z.strictObject({
          attribute: z
            .string()
            .min(1)
            .describe('A DSL attribute as nodes_read shows it, e.g. "opacity", "fill", "link", "textStylePreset".'),
          op: z.enum(QUERY_OPERATORS),
          value: z
            .string()
            .exactOptional()
            .describe("What to compare with, not for exists and notExists. Numbers compare as numbers (16px is 16)."),
        }),
      )
      .min(1)
      .max(QUERY_CONDITIONS_MAX)
      .describe("A layer must meet every condition."),
    type: z.string().min(1).exactOptional().describe('Only layers of this type, e.g. "FrameNode", "RichTextNode".'),
    pagePath: z.string().startsWith("/").exactOptional().describe("One page; omit to look through every web page."),
    limit: z.number().int().min(1).max(FIND_LIMIT_MAX).default(FIND_LIMIT),
  }),
  output: z.object({
    matches: z.array(MatchSchema),
    /** More matched than the limit, or the walk stopped on a very large page. */
    truncated: z.boolean(),
  }),
  async run({ runtime }, { where, type, pagePath, limit }) {
    const matches: z.output<typeof MatchSchema>[] = [];
    let complete = true;

    for (const page of await pagesToSearch(runtime.port, pagePath)) {
      const { layers, complete: seenAll } = await pageLayers(runtime.port, page.id);

      complete &&= seenAll;

      for (const { node } of layers) {
        const read = fromPluginNode(node, null);

        if (
          (type === undefined || read.type === type) &&
          where.every((condition) => meetsCondition(read.attributes, condition))
        ) {
          matches.push({
            id: idOf(node),
            page: page.path ?? "",
            type: read.type,
            name: nameOf(node),
            attributes: Object.fromEntries(
              where.flatMap(({ attribute }) => {
                const value = read.attributes[attribute];

                return value === undefined ? [] : [[attribute, value]];
              }),
            ),
          });
        }
      }
    }

    return {
      matches: matches.slice(0, limit),
      truncated: !complete || matches.length > limit,
    };
  },
  describe({ where }, { matches }) {
    return {
      subject: where.map(({ attribute, op, value }) => [attribute, op, value].filter(Boolean).join(" ")).join(" · "),
      summary: countOf(matches.length, "layer"),
    };
  },
});
