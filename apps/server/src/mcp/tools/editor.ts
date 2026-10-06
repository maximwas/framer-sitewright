import type { McpServer } from "@modelcontextprotocol/server";
import {
  currentUser,
  editorNavigate,
  editorSelect,
  editorZoom,
  PRODUCT,
  pluginDataGet,
  pluginDataSet,
  selectionWait,
} from "@sitewright/core";
import type { ToolContext } from "../../types/mcp.ts";
import { addOperationTool } from "../add-tool.ts";

const PLUGIN_ONLY = `Works through the ${PRODUCT.title} plugin only, open in this project.`;

export function registerEditorTools(server: McpServer, context: ToolContext): void {
  addOperationTool(server, context, editorSelect, {
    name: "nodes_select",
    title: "Select layers in the editor",
    description: `Selects layers on the Framer canvas, to show the user what you changed or are about to change; [] clears the selection. ${PLUGIN_ONLY}`,
  });
  addOperationTool(server, context, editorNavigate, {
    name: "node_show",
    title: "Show a layer in the editor",
    description: `Scrolls the Framer editor to a layer, a page or a CMS item, selecting it and zooming to it unless told not to: the way to point the user at a spot. ${PLUGIN_ONLY}`,
  });
  addOperationTool(server, context, editorZoom, {
    name: "nodes_zoom",
    title: "Zoom to layers",
    description: `Zooms the Framer canvas so the layers fit on screen, without selecting them. ${PLUGIN_ONLY}`,
  });
  addOperationTool(server, context, selectionWait, {
    name: "selection_wait",
    title: "Wait for the user to pick layers",
    description: `Waits (up to 25 s) for the user to select something new on the canvas and returns it: ask them to click the layer they mean, then call this. timedOut true means nothing new was picked in time; ask again or use selection_get. ${PLUGIN_ONLY}`,
  });
  addOperationTool(server, context, pluginDataGet, {
    name: "plugin_data_get",
    title: "Read plugin data",
    description: `Reads the small notes ${PRODUCT.title} keeps in the project or on a layer (plugin data): one key, or every key with its value. Only this plugin's own data. ${PLUGIN_ONLY}`,
  });
  addOperationTool(server, context, pluginDataSet, {
    name: "plugin_data_set",
    title: "Write plugin data",
    description: `Keeps a small note in the project or on a layer as plugin data (Framer allows 2 KB a key, 4 KB in all); null deletes the key. It never shows on the site: use it for state between sessions, e.g. when a sync last ran. ${PLUGIN_ONLY}`,
  });
  addOperationTool(server, context, currentUser, {
    name: "framer_user",
    title: "Who is signed in",
    description: "The Framer user the connection works as: name, initials and avatar.",
  });
}
