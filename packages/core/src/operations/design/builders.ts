import * as z from "zod";
import { OperationError } from "../../errors.ts";
import { THEME_TOGGLE_EXPORT, themeToggleCode } from "../../utils/theme-toggle.ts";
import { cmsSeoCollection } from "../cms/seo.ts";
import { codeFileWrite } from "../code/code-files.ts";
import { defineOperation } from "../define.ts";
import { pagesCreate } from "../pages/pages.ts";
import { designApply } from "./apply.ts";

export const themeToggleAdd = defineOperation({
  name: "theme.toggleAdd",
  effect: "write",
  idempotent: true,
  permissions: ["createCodeFile", "CodeFile.setFileContent"],
  input: z.strictObject({
    nodeId: z
      .string()
      .min(1)
      .exactOptional()
      .describe("The button or icon that switches the theme; omit to only write the override."),
    pagePath: z.string().startsWith("/").default("/"),
    fileName: z.string().min(1).default("ThemeToggle.tsx"),
  }),
  output: z.object({
    file: z.string(),
    tokens: z.number().int(),
    attachedTo: z.string().nullable(),
  }),
  async run(context, { nodeId, pagePath, fileName }) {
    const tokens = (await context.runtime.port.getColorStyles()).flatMap(({ id, path, light, dark }) =>
      dark === null
        ? []
        : [
            {
              id,
              path,
              light,
              dark,
            },
          ],
    );

    if (tokens.length === 0) {
      throw new OperationError(
        "INVALID_INPUT",
        "No color token has a dark value, so there is nothing to switch.",
        "Give the tokens dark values with color_tokens_upsert first.",
      );
    }

    const file = await codeFileWrite.run(context, {
      name: fileName,
      code: themeToggleCode(tokens),
    });

    if (nodeId !== undefined) {
      const result = await designApply.run(context, {
        dsl: `SET ${nodeId} codeOverride="codeFile/${file.id}:${THEME_TOGGLE_EXPORT}";`,
        pagePath,
      });

      if (!result.ok) {
        throw new OperationError(
          "WRITE_FAILED",
          `The override is written, but Framer did not attach it: ${result.message}`,
        );
      }
    }

    return {
      file: file.name,
      tokens: tokens.length,
      attachedTo: nodeId ?? null,
    };
  },
  describe(_input, { file, tokens }) {
    return {
      subject: file,
      summary: `${tokens} tokens switch`,
    };
  },
});

export const blogAdd = defineOperation({
  name: "cms.blogAdd",
  effect: "write",
  idempotent: false,
  permissions: ["createCollection", "Collection.addFields", "createWebPage"],
  needsAgent: true,
  input: z.strictObject({
    collection: z.string().min(1).default("Blog"),
    path: z
      .string()
      .regex(/^\/[a-z0-9-]+$/)
      .default("/blog")
      .describe("The list page; posts live under it."),
  }),
  output: z.object({
    collection: z.string(),
    listPage: z.string(),
    detailPage: z.string(),
    next: z.string(),
  }),
  async run(context, { collection, path }) {
    await cmsSeoCollection.run(context, {
      name: collection,
      categories: ["Guides", "News", "Case studies"],
    });

    const pages = await context.runtime.port.getNodesWithType("WebPageNode");

    if (!pages.some((page) => page.path === path)) {
      await pagesCreate.run(context, { path });
    }

    const detail = `${path}/:${collection}`;
    const result = await designApply.run(context, {
      dsl: `+WebPageNode blog_post name="${collection} post" path="${detail}";`,
      pagePath: "/",
    });

    if (!result.ok) {
      throw new OperationError(
        "WRITE_FAILED",
        `The collection and ${path} are made, but not the post page: ${result.message}`,
      );
    }

    return {
      collection,
      listPage: path,
      detailPage: detail,
      next: `Build the list on ${path} and the post on ${detail} in the site's own styles: read framer_docs guide "CMS Collection Lists" and section "CMS detail pages", take the field ids from cms_collections_list, then add posts with cms_items_upsert and run cms_interlink.`,
    };
  },
  describe(_input, { collection, listPage }) {
    return {
      subject: collection,
      summary: listPage,
    };
  },
});
