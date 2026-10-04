import type { McpServer } from "@modelcontextprotocol/server";
import {
  type ActivityNote,
  ActivityNoteSchema,
  iconsSearch,
  imagesSearch,
  imageUpload,
  PRODUCT,
  svgAdd,
} from "@sitewright/core";
import * as z from "zod";
import { imageSourceOf } from "../../assets/image-source.ts";
import type { ToolContext } from "../../types/mcp.ts";
import { addOperationTool, addTool, operationAnnotations, runOperationTool } from "../add-tool.ts";

export function registerAssetTools(server: McpServer, context: ToolContext): void {
  addOperationTool(server, context, imagesSearch, {
    name: "images_search",
    title: "Search stock images",
    description:
      "Finds Unsplash photos for a section and returns their urls: put one in a frame's fill (fill=\"<url>\", with altText). Pass width as twice the frame's display width. Use photos where the design needs real-world imagery, not as decoration everywhere.",
  });

  addTool(server, {
    name: "image_upload",
    title: "Upload an image",
    description:
      "Uploads an image to the project's assets and returns its url, for a fill, a logo or a favicon. Pass exactly one of: url (https), path (absolute path to a local png, jpg, gif, webp, avif or svg), or svg (SVG markup: own icons, logos and illustrations drawn as vectors).",
    input: z.strictObject({
      url: z.string().min(1).exactOptional(),
      path: z.string().min(1).exactOptional(),
      svg: z.string().min(1).exactOptional(),
      name: z.string().min(1).exactOptional(),
      altText: z.string().exactOptional(),
    }),
    output: imageUpload.output.extend({ activity: ActivityNoteSchema }),
    annotations: operationAnnotations(imageUpload),
    run: async ({
      url,
      path,
      svg,
      name,
      altText,
    }): Promise<z.output<typeof imageUpload.output> & { activity: ActivityNote }> =>
      runOperationTool(context, "image_upload", imageUpload, {
        image: await imageSourceOf({
          url,
          path,
          svg,
        }),
        ...(name === undefined ? {} : { name }),
        ...(altText === undefined ? {} : { altText }),
      }),
  });

  addOperationTool(server, context, svgAdd, {
    name: "svg_add",
    title: "Add an SVG layer",
    description: `Adds SVG markup as an editable vector layer — own icons, logos, illustrations — and returns the new layer's id (nodeIds). Without parentId Framer puts it into the layer selected in the editor; with it, it moves there. Its size cannot be set through the DSL: to reuse a logo or icon across the site, ask the user to add the layer to a project vector set (Vectors panel; the API cannot), then place it as an IconNode of that set. Works through the ${PRODUCT.title} plugin only.`,
  });

  addOperationTool(server, context, iconsSearch, {
    name: "icons_search",
    title: "Search icons",
    description:
      'Finds icons by name across Framer\'s icon sets (Phosphor, Lucide, Material, Feather, Logos for brand logos…) and returns the set ids, exact icon names and each set\'s controls. Insert with +IconNode set="<setId>" $control__icon="<exact name>"; never guess names. For an icon no set has, draw it as SVG (image_upload svg or svg_add).',
  });
}
