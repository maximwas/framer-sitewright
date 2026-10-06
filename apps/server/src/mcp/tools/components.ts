import type { McpServer } from "@modelcontextprotocol/server";
import { componentControlsSet, componentInsert, componentsRead } from "@sitewright/core";
import type { ToolContext } from "../../types/mcp.ts";
import { addOperationTool } from "../add-tool.ts";

export function registerComponentTools(server: McpServer, context: ToolContext): void {
  addOperationTool(server, context, componentsRead, {
    name: "components_read",
    title: "Read components",
    description:
      "Lists the project's components with their exact controls ($control__variant options, $control__<name> for each variable) before you place or change instances. Control names are the ones listed here, e.g. $control__showIcon; do not derive them from variable names. Code components are listed in codeComponents and Framer's own (Video, Google Maps, Embed, Slideshow, Carousel, Countdown, Cookie Banner, Search…) in framer: place any of them with +ComponentInstanceNode component=\"<id>\", and pass its id in ids to read its controls first. Needs the project's Server API key (framer_status shows whether it is set).",
  });
  addOperationTool(server, context, componentInsert, {
    name: "component_insert",
    title: "Insert a component",
    description:
      "Inserts a component by its module URL (framer.com/m/…): a free Marketplace component from marketplace_browse (moduleUrl), or a URL the user copied from the Insert menu. design_apply cannot take a URL; Framer's own components (Video, YouTube, Google Maps, Embed, Slideshow, Carousel, Countdown…) it places by the ids components_read lists in framer. Then set its controls with design_apply ($control__…) or component_controls_set. Undo does not remove it.",
  });
  addOperationTool(server, context, componentControlsSet, {
    name: "component_controls_set",
    title: "Set component controls",
    description:
      'Sets control values on a component instance, object controls included: a code component\'s arrows, dots or clipping, which design_apply refuses ("unsupported type object"). Names are the component\'s own, without $control__; an object merges with the instance\'s current value, so { arrows: { show: false } } keeps the other arrow settings. Simple controls (text, numbers, slots) still go through design_apply. Image URLs in image fields (image, images, photo, poster, logo… alone, in a list or in a list\'s entries) are uploaded first, since Framer keeps only uploaded images there: this is how a Marketplace carousel gets your photos ({ slides: [{ image: "<url>", caption: "…" }] }). The answer holds the controls as Framer kept them; notStored lists what it refused without an error (a transition object, a list of images): set those with design_apply $control__… or ask the user to set them in the editor. Undo does not restore controls set here.',
  });
}
