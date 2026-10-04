import * as z from "zod";
import { ICON_SEARCH_MAX_NAMES, ICON_SET_GROUPS } from "../../constants/assets.ts";
import { OperationError } from "../../errors.ts";
import { requireAgent } from "../../framer/runtime.ts";
import { ControlsByIdSchema, IconNamesSchema, IconSetCatalogSchema } from "../../schemas/assets.ts";
import { countOf } from "../../utils/text.ts";
import { defineOperation } from "../define.ts";
import { matchIcons } from "./icon-match.ts";

export const iconsSearch = defineOperation({
  name: "icons.search",
  effect: "read",
  idempotent: true,
  permissions: [],
  needsAgent: true,
  input: z.strictObject({
    query: z.string().min(1).describe('Words of the icon name, e.g. "arrow right" or "menu".'),
    set: z
      .string()
      .min(1)
      .exactOptional()
      .describe("A set id or name (Phosphor, Lucide, Logos…). Omit to search every set."),
    limit: z.number().int().min(1).max(ICON_SEARCH_MAX_NAMES).default(20),
  }),
  output: z.object({
    sets: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        group: z.enum(ICON_SET_GROUPS),
      }),
    ),
    matches: z.array(
      z.object({
        setId: z.string(),
        setName: z.string(),
        icons: z.array(z.string()),
        controls: z.unknown(),
      }),
    ),
  }),
  async run({ runtime }, { query, set, limit }) {
    const agent = requireAgent(runtime);
    const catalog = IconSetCatalogSchema.parse(await agent.listIconSets());
    const sets = ICON_SET_GROUPS.flatMap((group) =>
      catalog[group].map((entry) => ({
        id: entry.id,
        name: entry.displayName,
        group,
      })),
    );
    const wanted =
      set === undefined ? sets : sets.filter(({ id, name }) => id === set || name.toLowerCase() === set.toLowerCase());

    if (wanted.length === 0) {
      throw new OperationError(
        "NOT_FOUND",
        `No icon set "${set}".`,
        `Sets: ${sets.map(({ name }) => name).join(", ")}.`,
      );
    }

    const found = await Promise.all(
      wanted.map(async ({ id, name }) => ({
        setId: id,
        setName: name,
        icons: matchIcons(IconNamesSchema.parse(await agent.readIcons({ iconSetId: id })), query, limit),
      })),
    );
    const hits = found.filter(({ icons }) => icons.length > 0);
    const controls =
      hits.length === 0
        ? {}
        : ControlsByIdSchema.parse(await agent.readIconSetControls({ iconSetIds: hits.map(({ setId }) => setId) }));

    return {
      sets,
      matches: hits.map((hit) => ({
        ...hit,
        controls: controls[hit.setId] ?? null,
      })),
    };
  },
  describe({ query, set }, { matches }) {
    const icons = matches.reduce((sum, { icons: found }) => sum + found.length, 0);

    return {
      subject: set === undefined ? `“${query}”` : `“${query}” in ${set}`,
      summary: `${countOf(icons, "icon")} in ${countOf(matches.length, "set")}`,
    };
  },
});
