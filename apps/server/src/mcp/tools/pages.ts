import type { McpServer } from "@modelcontextprotocol/server";
import {
  deploymentsList,
  nodesFind,
  pagesCreate,
  pagesDelete,
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

  addOperationTool(server, context, deploymentsList, {
    name: "deployments_list",
    title: "List deployments",
    description: "The site's newest deployments: when, by whom, and whether they went live or failed.",
  });
}
