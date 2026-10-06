import type { McpServer } from "@modelcontextprotocol/server";
import {
  deploymentsList,
  nodesFind,
  pagesCreate,
  pagesDelete,
  pagesDuplicate,
  publishPreview,
  publishStatus,
  redirectsList,
  redirectsSet,
  textReplace,
} from "@sitewright/core";
import type { ToolContext } from "../../types/mcp.ts";
import { addOperationTool } from "../add-tool.ts";

/** Pages, finding and replacing across them, redirects, and where the site is published. */
export function registerPageTools(server: McpServer, context: ToolContext): void {
  addOperationTool(server, context, pagesCreate, {
    name: "page_create",
    title: "Create a page",
    description:
      'Creates an empty web page at a path ("/about") or a design page (a canvas for drafts) by name. Build its content with design_apply; add breakpoints with breakpoints_add. Undo does not remove pages.',
  });

  addOperationTool(server, context, pagesDelete, {
    name: "page_delete",
    title: "Delete a page",
    description:
      "Deletes a web page by path or a design page by name, with everything on it. Undo cannot bring it back: delete only pages the user asked to remove or you created yourself. The home page cannot be deleted.",
  });

  addOperationTool(server, context, pagesDuplicate, {
    name: "page_duplicate",
    title: "Duplicate a page",
    description:
      'Copies a page with everything on it: a web page (path) to a new path (newPath, e.g. "/about-b"), keeping its breakpoints, their overrides and its settings; or a design page (designPage) under a new name (newName). Use it for a variant of a page (an A/B version, a landing page from an existing one) instead of rebuilding it with design_apply. The new path must be free. A web page copy is a draft by default, which publishing leaves out until the user turns the draft off; draft: false publishes it with the site. Works with or without the Server API key. Returns the copy\'s id, path or name, and whether it is a draft. Undo does not remove the copy: delete it with page_delete.',
  });

  addOperationTool(server, context, nodesFind, {
    name: "nodes_find",
    title: "Find layers",
    description:
      "Finds layers across the site's pages (or one page) by part of their name or text, and/or by type, on each page's main breakpoint. Returns their ids for nodes_read and design_apply.",
  });

  addOperationTool(server, context, textReplace, {
    name: "text_replace",
    title: "Replace text",
    description:
      "Replaces text inside text layers across the site's pages (or one page), through design_apply, so the journal can undo it. Run it with dryRun first and show the user what changes. A replaced text keeps its text style, but formatting inside it (bold words, links in the text) becomes plain.",
  });

  addOperationTool(server, context, redirectsList, {
    name: "redirects_list",
    title: "List redirects",
    description: "Lists the site's redirects: from which path, to which path or URL, and for every locale or not.",
  });

  addOperationTool(server, context, redirectsSet, {
    name: "redirects_set",
    title: "Change redirects",
    description:
      "Adds redirects (a from path that has one already changes it) and removes them by their from path. Redirects need a paid Framer plan. Undo does not restore redirects yet: the changed and removed ones are in the result.",
  });

  addOperationTool(server, context, publishStatus, {
    name: "publish_status",
    title: "Publish status",
    description:
      "Where the site is published (production and staging URLs, when) and which pages changed since the last publish. Publish with project_publish, only when the user asks.",
  });

  addOperationTool(server, context, publishPreview, {
    name: "publish_preview",
    title: "Preview a publish",
    description:
      "Shows what publishing would do, without publishing: whether it is blocked, the blocking errors and the warnings (with the layer's id when Framer names one), the pages (with their paths), components and other parts changed since the last publish, where it would go (production, staging or a branch preview) and the site's URLs. Use it before the user publishes, to fix what blocks or warns first, and to find the live URL for reference_screenshot. It never publishes: the user does, or project_publish when they ask. Needs the project's Server API key.",
  });

  addOperationTool(server, context, deploymentsList, {
    name: "deployments_list",
    title: "List deployments",
    description: "The site's newest deployments: when, by whom, and whether they went live or failed.",
  });
}
