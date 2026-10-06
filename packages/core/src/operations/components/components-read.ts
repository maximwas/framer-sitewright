import * as z from "zod";
import { requireAgent } from "../../framer/runtime.ts";
import { serializedById } from "../../history/dsl/serialized.ts";
import { CodeComponentEntriesSchema, ComponentCatalogSchema, ControlsByIdSchema } from "../../schemas/assets.ts";
import type { SerializedNode } from "../../types/dsl.ts";
import { withComponentFacts } from "../../utils/component-controls.ts";
import { countOf } from "../../utils/text.ts";
import { defineOperation } from "../define.ts";

export const componentsRead = defineOperation({
  name: "components.read",
  effect: "read",
  idempotent: true,
  permissions: [],
  needsAgent: true,
  input: z.strictObject({
    ids: z
      .array(z.string().min(1))
      .max(50)
      .exactOptional()
      .describe("Component ids to read controls for. Omit for every canvas component of the project."),
  }),
  output: z.object({
    components: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        controls: z.unknown(),
      }),
    ),
    codeFiles: z.array(z.string()),
    codeComponents: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        file: z.string(),
      }),
    ),
    /** Framer's own components: place one with +ComponentInstanceNode component="<id>", read its controls by id. */
    framer: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        keywords: z.string().nullable(),
      }),
    ),
  }),
  async run({ runtime }, { ids }) {
    const agent = requireAgent(runtime);
    const catalog = ComponentCatalogSchema.parse(await agent.listComponents());
    const canvas = catalog.project.canvas;
    const wanted = ids === undefined ? canvas.map(({ id }) => id) : ids;
    const [controls, nodes]: [Record<string, unknown>, Map<string, SerializedNode>] =
      wanted.length === 0
        ? [{}, new Map()]
        : await Promise.all([
            agent.readComponentControls({ componentIds: wanted }).then((read) => ControlsByIdSchema.parse(read)),
            // The component nodes hold the variant names and option values as they are now: only a help.
            agent
              .serializeNodes({
                ids: wanted,
                depth: 0,
              })
              .then(serializedById)
              .catch(() => new Map<string, SerializedNode>()),
          ]);
    const codeComponents = Object.entries(catalog.project.code).flatMap(([file, entries]) => {
      const declared = CodeComponentEntriesSchema.safeParse(entries);

      return declared.success
        ? declared.data.map((entry) => ({
            id: entry.id,
            name: entry.displayName ?? entry.name ?? entry.id,
            file,
          }))
        : [];
    });
    // Code components are named by their export: the journal shows "ScrollVideo", not codeFile/…:default.
    const names = new Map([
      ...codeComponents.map((entry) => [entry.id, entry.name] as const),
      ...canvas.map((entry) => [entry.id, entry.displayName] as const),
    ]);

    return {
      components: wanted.map((id) => {
        const node = nodes.get(id);

        return {
          id,
          // The node's name keeps its folder ("Lab/Button"); the catalog drops it.
          name: typeof node?.name === "string" ? node.name : (names.get(id) ?? id),
          controls: withComponentFacts(controls[id] ?? null, node),
        };
      }),
      codeFiles: Object.keys(catalog.project.code),
      codeComponents,
      framer: catalog.additional.map(({ id, displayName, keywords }) => ({
        id,
        name: displayName,
        keywords: keywords ?? null,
      })),
    };
  },
  describe({ ids }, { components, codeComponents }) {
    return {
      subject: ids === undefined ? "All components" : components.map(({ name }) => name).join(", "),
      summary: `${countOf(components.length, "component")}, ${countOf(codeComponents.length, "code component")}`,
    };
  },
});
