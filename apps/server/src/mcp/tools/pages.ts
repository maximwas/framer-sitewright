import type { McpServer } from "@modelcontextprotocol/server";
import {
  deploymentsList,
  nodesFind,
  nodesQuery,
  pagesCreate,
  pagesDelete,
  pagesDuplicate,
  publishPreview,
  publishStatus,
  redirectsList,
  redirectsSet,
  siteSettingsGet,
  siteSettingsSet,
  textReplace,
} from "@sitewright/core";
import type { ToolContext } from "../../types/mcp.ts";
import { addOperationTool } from "../add-tool.ts";

/** Pages, finding and replacing across them, site and page settings, redirects, and where the site is published. */
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
  addOperationTool(server, context, nodesQuery, {
    name: "nodes_query",
    title: "Query layers by attributes",
    description:
      'Finds layers across the site\'s pages (or one page) whose DSL attributes meet every condition, e.g. all text smaller than 14px, every frame with an image fill, links with no link style: [{ attribute: "opacity", op: "lessThan", value: "1" }]. Operators: equals, contains, lessThan, greaterThan (numbers compare as numbers, 16px is 16), exists, notExists. Returns each layer with its page and the attributes the conditions name; change them with design_apply. Attributes are read as the Plugin API gives them, on each page\'s main breakpoint.',
  });

  addOperationTool(server, context, textReplace, {
    name: "text_replace",
    title: "Replace text",
    description:
      "Replaces text inside text layers across the site's pages (or one page), including breakpoint copies that hold their own text (a copy that follows the primary breakpoint changes with it); the journal can undo it. Run it with dryRun first and show the user what changes. Each change says what happens to the formatting inside the layer: kept (with the Server API key Framer replaces in place: bold, links and lists stay), partial (the match crosses differently formatted runs and takes the formatting of the run it starts in), plain (without a key the layer is rewritten as plain text through design_apply).",
  });

  addOperationTool(server, context, siteSettingsGet, {
    name: "site_settings_get",
    title: "Read site settings",
    description:
      "Reads the site's settings and every page's in one place. The site: title, description, social image and favicons (light, dark, Apple touch icon), which every page inherits. Each page: its own title, description and social image (null inherits the site's), noIndex (hidden from search engines), noIndexSite (hidden from the site's own search), its layout template and whether it is a draft; plus the layout templates there are. Without a Server API key only the pages' paths and drafts are visible. Change them with site_settings_set.",
  });

  addOperationTool(server, context, siteSettingsSet, {
    name: "site_settings_set",
    title: "Change site settings",
    description:
      "Changes the site's and pages' settings in one call, so the fixes seo_audit suggests land together. The site: title, description, socialImage, favicon, faviconDark, appleTouchIcon (favicons exist only on the site). Pages by path, each with only what changes: title, description, socialImage, noIndex, noIndexSite, layoutTemplate, draft (noIndex exists only on pages). null clears a value, so a page inherits the site's again. noIndexSite follows noIndex unless given: Framer turns it on with noIndex and keeps it on after. Framer downloads each image URL itself; one it cannot download is left out and the call fails, but the rest is applied (the answer shows the settings as they are now). A page on a layout template takes its breakpoints' background, padding and gap from the template, so fill on them is refused. The journal can undo it; needs the Server API key.",
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
