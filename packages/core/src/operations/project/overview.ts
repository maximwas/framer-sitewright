import * as z from "zod";
import { countOf } from "../../utils/text.ts";
import { defineOperation } from "../define.ts";

export const projectOverview = defineOperation({
  name: "project.overview",
  effect: "read",
  idempotent: true,
  permissions: [],
  input: z.strictObject({}),
  output: z.object({
    project: z.object({
      id: z.string(),
      name: z.string(),
    }),
    transport: z.enum(["server-api", "plugin"]),
    pages: z.array(
      z.object({
        id: z.string(),
        path: z.string().nullable(),
        draft: z.boolean(),
        cmsCollectionId: z.string().nullable(),
      }),
    ),
    designPages: z.array(
      z.object({
        id: z.string(),
        name: z.string().nullable(),
      }),
    ),
    counts: z.object({
      colorTokens: z.number().int(),
      textStyles: z.number().int(),
      components: z.number().int(),
      collections: z.number().int(),
    }),
  }),
  async run({ runtime }) {
    const { port } = runtime;
    const [project, pages, designPages, components, collections, colorStyles, textStyles] = await Promise.all([
      port.getProjectInfo(),
      port.getNodesWithType("WebPageNode"),
      port.getNodesWithType("DesignPageNode"),
      port.getNodesWithType("ComponentNode"),
      port.getCollections(),
      port.getColorStyles(),
      port.getTextStyles(),
    ]);

    return {
      project: {
        id: project.id,
        name: project.name,
      },
      transport: runtime.transport,
      pages: pages.map((page) => ({
        id: page.id,
        path: page.path,
        draft: page.draft,
        cmsCollectionId: page.collectionId,
      })),
      designPages: designPages.map((page) => ({
        id: page.id,
        name: page.name,
      })),
      counts: {
        colorTokens: colorStyles.length,
        textStyles: textStyles.length,
        components: components.length,
        collections: collections.length,
      },
    };
  },
  describe(_input, { project, pages, counts }) {
    return {
      subject: project.name,
      summary: [
        countOf(pages.length, "page"),
        countOf(counts.colorTokens, "token"),
        countOf(counts.textStyles, "text style"),
        countOf(counts.components, "component"),
      ].join(", "),
    };
  },
});
