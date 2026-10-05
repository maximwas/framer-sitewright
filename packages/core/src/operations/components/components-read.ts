import * as z from "zod";
import { requireAgent } from "../../framer/runtime.ts";
import { CodeComponentEntriesSchema, ComponentCatalogSchema, ControlsByIdSchema } from "../../schemas/assets.ts";
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
  }),
  async run({ runtime }, { ids }) {
    const agent = requireAgent(runtime);
    const catalog = ComponentCatalogSchema.parse(await agent.listComponents());
    const canvas = catalog.project.canvas;
    const wanted = ids === undefined ? canvas.map(({ id }) => id) : ids;
    const controls =
      wanted.length === 0 ? {} : ControlsByIdSchema.parse(await agent.readComponentControls({ componentIds: wanted }));
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
      components: wanted.map((id) => ({
        id,
        name: names.get(id) ?? id,
        controls: controls[id] ?? null,
      })),
      codeFiles: Object.keys(catalog.project.code),
      codeComponents,
    };
  },
  describe({ ids }, { components, codeComponents }) {
    return {
      subject: ids === undefined ? "All components" : components.map(({ name }) => name).join(", "),
      summary: `${countOf(components.length, "component")}, ${countOf(codeComponents.length, "code component")}`,
    };
  },
});
