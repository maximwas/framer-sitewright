import * as z from "zod";
import { PAGES_UNDO_NOTE } from "../../constants/nodes.ts";
import { OperationError } from "../../errors.ts";
import { nodeRecord } from "../../plugin-nodes/node-record.ts";
import type { DesignPageData, FramerPort, WebPageData } from "../../types/framer-port.ts";
import type { ClonablePage } from "../../types/pages.ts";
import { storedPagePath } from "../../utils/page-path.ts";
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

    const { page, web } = await findPage(port, path, designPage);
    const layers = (await port.getChildren(page.id)).length;

    history?.markIncomplete("Undo does not bring a deleted page back.");
    await port.removeNodes([page.id]);

    return {
      id: page.id,
      kind: web ? ("web" as const) : ("design" as const),
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

/**
 * Copies a page with everything on it: a web page's breakpoints with their overrides, its settings, a design page's
 * canvas. A web page copy is a draft by default, which publishing leaves out until the user turns the draft off.
 */
export const pagesDuplicate = defineOperation({
  name: "pages.duplicate",
  effect: "write",
  idempotent: false,
  permissions: ["WebPageNode.clone", "DesignPageNode.clone", "Node.setAttributes"],
  input: z
    .strictObject({
      path: z.string().startsWith("/").exactOptional().describe('The web page to copy, by its path, e.g. "/about".'),
      designPage: z.string().min(1).exactOptional().describe("The design page to copy, by its name."),
      newPath: z
        .string()
        .startsWith("/")
        .exactOptional()
        .describe('The web page copy\'s path, e.g. "/about-b"; no other page may have it.'),
      newName: z
        .string()
        .min(1)
        .exactOptional()
        .describe("The design page copy's name; Framer adds a number when another page has it."),
      draft: z
        .boolean()
        .default(true)
        .describe(
          "Keep a web page copy off the published site until the user turns its draft off; false publishes it.",
        ),
    })
    .refine(
      ({ path, designPage }) => (path === undefined) !== (designPage === undefined),
      "Give a path or a designPage to copy.",
    )
    .refine(
      ({ path, newPath }) => (path === undefined) === (newPath === undefined),
      "A web page copy needs its own path in newPath; a design page takes none.",
    )
    .refine(({ path, newName }) => path === undefined || newName === undefined, "newName is for design pages."),
  output: PageSchema.extend({
    /** Whether the web page copy is a draft, which publishing leaves out; null for a design page. */
    draft: z.boolean().nullable(),
    /** The copied page's path or name. */
    from: z.string(),
  }),
  async run({ runtime, history }, { path, designPage, newPath, newName, draft }) {
    const { port } = runtime;
    const { page, web } = await findPage(port, path, designPage);
    const source = path ?? designPage ?? page.id;

    if (newPath !== undefined) {
      const stored = storedPagePath(newPath);
      const pages = await port.getNodesWithType("WebPageNode");

      // Framer would give the copy another path without a word ("/about-2"): refuse instead.
      if (pages.some((other) => other.path === newPath || other.path === stored)) {
        throw new OperationError("INVALID_INPUT", `A page at ${newPath} already exists.`, "Pick another newPath.");
      }
    }

    const node = await port.getNode(page.id);

    if (!isClonablePage(node)) {
      throw new OperationError("UNSUPPORTED_TRANSPORT", `This Framer runtime cannot copy ${source}.`);
    }

    history?.markIncomplete(PAGES_UNDO_NOTE);

    const options = newPath === undefined ? (newName === undefined ? {} : { name: newName }) : { path: newPath };
    const copy = nodeRecord(await node.clone(options));

    if (copy === null) {
      throw new OperationError("WRITE_FAILED", `Framer did not copy ${source}.`);
    }

    const id = String(copy.id);
    // Framer's typings promise a draft copy, but the copy keeps the page's own state (06.10.2026): set it.
    const copied = web && copy.draft !== draft ? (nodeRecord(await port.setAttributes(id, { draft })) ?? copy) : copy;

    return {
      id,
      kind: web ? ("web" as const) : ("design" as const),
      path: web ? (typeof copy.path === "string" ? copy.path : (newPath ?? null)) : null,
      name: web ? null : typeof copy.name === "string" ? copy.name : (newName ?? null),
      draft: web && typeof copied.draft === "boolean" ? copied.draft : null,
      from: source,
    };
  },
  describe(_input, { path, name, from, draft }) {
    return {
      subject: path ?? name,
      summary: draft ? `Copied from ${from}, as a draft` : `Copied from ${from}`,
    };
  },
});

/** A web page by path (either spelling Framer may store) or a design page by name; NOT_FOUND without one. */
async function findPage(
  port: FramerPort,
  path: string | undefined,
  designPage: string | undefined,
): Promise<{ page: WebPageData | DesignPageData; web: boolean }> {
  const stored = path === undefined ? undefined : storedPagePath(path);
  const web =
    path === undefined
      ? undefined
      : (await port.getNodesWithType("WebPageNode")).find((page) => page.path === path || page.path === stored);
  const design =
    designPage === undefined
      ? undefined
      : (await port.getNodesWithType("DesignPageNode")).find((page) => page.name === designPage);
  const page = web ?? design;

  if (page === undefined) {
    throw new OperationError("NOT_FOUND", `No page ${path ?? designPage}.`, "Call project_overview to list pages.");
  }

  return {
    page,
    web: web !== undefined,
  };
}

/** A page node Framer can copy: WebPageNode.clone({ path }) or DesignPageNode.clone({ name }). */
function isClonablePage(value: unknown): value is ClonablePage {
  return typeof value === "object" && value !== null && "clone" in value && typeof value.clone === "function";
}
