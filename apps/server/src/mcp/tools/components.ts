import type { McpServer } from "@modelcontextprotocol/server";
import { componentControlsSet, componentInsert, componentsRead } from "@sitewright/core";
import type { ToolContext } from "../../types/mcp.ts";
import { addOperationTool } from "../add-tool.ts";

export function registerComponentTools(server: McpServer, context: ToolContext): void {
  addOperationTool(server, context, componentsRead, {
    name: "components_read",
    title: "Read components",
    description:
      'Lists the project\'s components with their exact controls ($control__variant options, $control__<name> for each variable) before you place or change instances. Control names are the ones listed here, e.g. $control__showIcon; do not derive them from variable names. Code components are listed in codeComponents: place one with +ComponentInstanceNode component="<id>".',
  });
  addOperationTool(server, context, componentInsert, {
    name: "component_insert",
    title: "Insert a component",
    description:
      "Inserts a component by its module URL (framer.com/m/…): a free Marketplace component from marketplace_browse (moduleUrl), one of Framer's own like Video or YouTube, or a URL the user copied from the Insert menu. design_apply cannot: it takes only the project's own component ids. Then set its controls with design_apply ($control__…) or component_controls_set. Undo does not remove it.",
  });
  addOperationTool(server, context, componentControlsSet, {
    name: "component_controls_set",
    title: "Set component controls",
    description:
      "Sets control values on a component instance, object controls included: a code component's arrows, dots or clipping, which design_apply refuses (\"unsupported type object\"). Names are the component's own, without $control__; an object merges with the instance's current value, so { arrows: { show: false } } keeps the other arrow settings. Simple controls (text, numbers, slots) still go through design_apply. Undo does not restore controls set here.",
  });
}
