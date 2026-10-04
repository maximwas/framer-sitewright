import type { McpServer } from "@modelcontextprotocol/server";
import { layoutAudit, nodesRead, PRODUCT, selectionGet } from "@sitewright/core";
import type { ToolContext } from "../../types/mcp.ts";
import { addOperationTool } from "../add-tool.ts";

export function registerNodeTools(server: McpServer, context: ToolContext): void {
  addOperationTool(server, context, nodesRead, {
    name: "nodes_read",
    title: "Read nodes",
    description:
      'Reads a node (or the page root) with its children to a given depth, as XML by default: tags are node types, attributes are ids, names and DSL attributes, $-attributes are read-only metadata. Blocks and runs of a rich text show no id: theirs follow from position (v:<text id>:<n>, then :<m>). Edit the XML and send it back with design_apply xml. format "json" returns raw serialize(). Keep depth low and filter attributes on big pages. Without a Server API key it reads through the Plugin API: the same XML with fewer attributes, and the plain text of a rich text instead of blocks and runs.',
  });
  addOperationTool(server, context, layoutAudit, {
    name: "layout_audit",
    title: "Audit the layout",
    description:
      "Checks a page (or one node and its children) for classes of layout defects that look broken on the published site, and returns each with the node and the fix: children of a stack lined up on different edges, cards of uneven height in grids and rows, text links in Framer's default link color, sections whose content width does not match the others, fixed widths and heights that break on narrower screens, gap ignored by space-between, nested corners that are not concentric, missing or skipped headings, uneven section spacing, and template habits (uppercase labels over every heading, numbered cards, a text-only page, Inter everywhere, headlines without balance). Run it after building a section and before calling a page done; fix every defect, then the likely ones. design_apply already returns the same findings for what it touched in audit.",
  });
  addOperationTool(server, context, selectionGet, {
    name: "selection_get",
    title: "Read the editor selection",
    description: `Returns the layers the user selected in the Framer editor (ids and names). Call it when the user says "this", "the selected one" or "what I picked", then read those ids with nodes_read and change them with design_apply. Works through the ${PRODUCT.title} plugin only, open in this project.`,
  });
}
