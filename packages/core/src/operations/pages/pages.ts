import * as z from "zod";
import { PAGES_UNDO_NOTE } from "../../constants/nodes.ts";
import { OperationError } from "../../errors.ts";
import { countOf } from "../../utils/text.ts";
import { defineOperation } from "../define.ts";

const PageTarget = z
  .strictObject({
    path: z.string().startsWith("/").exactOptional().describe('A web page by its path, e.g. "/about".'),
    designPage: z.string().min(1).exactOptional().describe("A design page (a canvas for drafts) by its name."),
  })
  .refine(
    ({ path, designPage }) => (path === undefined) !== (designPage === undefined),
    "Give a path or a designPage.",
  );

const PageSchema = z.object({
  id: z.string(),
  kind: z.enum(["web", "design"]),
  path: z.string().nullable(),
  name: z.string().nullable(),
});

export const pagesCreate = defineOperation({
  name: "pages.create",
  effect: "write",
  idempotent: false,
  permissions: ["createWebPage", "createDesignPage"],
  input: PageTarget,
  output: PageSchema,
  async run({ runtime, history }, { path, designPage }) {
    const { port } = runtime;

    if (designPage !== undefined) {
      const page = await port.createDesignPage(designPage);

      history?.markIncomplete(PAGES_UNDO_NOTE);

      return {
        id: page.id,
        kind: "design" as const,
        path: null,
        name: page.name ?? designPage,
      };
    }

    const wanted = path ?? "/";

    if ((await port.getNodesWithType("WebPageNode")).some((page) => page.path === wanted)) {
      throw new OperationError("INVALID_INPUT", `A page at ${wanted} already exists.`, "Pick another path.");
    }

    const page = await port.createWebPage(wanted);

    history?.markIncomplete(PAGES_UNDO_NOTE);

    return {
      id: page.id,
      kind: "web" as const,
      path: page.path ?? wanted,
      name: null,
    };
  },
  describe({ path, designPage }) {
    return {
      subject: path ?? designPage ?? null,
      summary: "Created",
    };
  },
});

export const pagesDelete = defineOperation({
  name: "pages.delete",
  effect: "destructive",
  idempotent: true,
  permissions: ["removeNodes"],
  input: PageTarget,
  output: PageSchema.extend({ layers: z.number().int() }),
  async run({ runtime, history }, { path, designPage }) {
    const { port } = runtime;

    if (path === "/") {
      throw new OperationError("INVALID_INPUT", "The home page cannot be deleted.");
    }

    const web =
      path === undefined ? undefined : (await port.getNodesWithType("WebPageNode")).find((page) => page.path === path);
    const design =
      designPage === undefined
        ? undefined
        : (await port.getNodesWithType("DesignPageNode")).find((page) => page.name === designPage);
    const page = web ?? design;

    if (page === undefined) {
      throw new OperationError("NOT_FOUND", `No page ${path ?? designPage}.`, "Call project_overview to list pages.");
    }

    const layers = (await port.getChildren(page.id)).length;

    history?.markIncomplete("Undo does not bring a deleted page back.");
    await port.removeNodes([page.id]);

    return {
      id: page.id,
      kind: web === undefined ? ("design" as const) : ("web" as const),
      path: path ?? null,
      name: designPage ?? null,
      layers,
    };
  },
  describe({ path, designPage }, { layers }) {
    return {
      subject: path ?? designPage ?? null,
      summary: `Deleted with ${countOf(layers, "top layer")}`,
    };
  },
});
