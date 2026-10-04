import type { McpServer } from "@modelcontextprotocol/server";
import { componentControlsSet, componentsRead } from "@sitewright/core";
import type { ToolContext } from "../../types/mcp.ts";
import { addOperationTool } from "../add-tool.ts";

export function registerComponentTools(server: McpServer, context: ToolContext): void {
  addOperationTool(server, context, componentsRead, {
    name: "components_read",
    title: "Read components",
    description:
      'Lists the project\'s components with their exact controls ($control__variant options, $control__<name> for each variable) before you place or change instances. Control names are the ones listed here, e.g. $control__showIcon; do not derive them from variable names. Code components are listed in codeComponents: place one with +ComponentInstanceNode component="<id>".',
  });
  addOperationTool(server, context, componentControlsSet, {
    name: "component_controls_set",
    title: "Set component controls",
    description:
      "Sets control values on a component instance, object controls included: a code component's arrows, dots or clipping, which design_apply refuses (\"unsupported type object\"). Names are the component's own, without $control__; an object merges with the instance's current value, so { arrows: { show: false } } keeps the other arrow settings. Simple controls (text, numbers, slots) still go through design_apply. Undo does not restore controls set here.",
  });
}
