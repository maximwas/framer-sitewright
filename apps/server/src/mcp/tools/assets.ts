import type { McpServer } from "@modelcontextprotocol/server";
import {
  type ActivityNote,
  ActivityNoteSchema,
  fileUpload,
  iconsSearch,
  imageUpload,
  PRODUCT,
  shadersRead,
  svgAdd,
} from "@sitewright/core";
import * as z from "zod";
import { fileSourceOf } from "../../assets/file-source.ts";
import { imageSourceOf } from "../../assets/image-source.ts";
import type { ToolContext } from "../../types/mcp.ts";
import { addOperationTool, addTool, operationAnnotations, runOperationTool } from "../add-tool.ts";

export function registerAssetTools(server: McpServer, context: ToolContext): void {
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

  addTool(server, {
    name: "file_upload",
    title: "Upload a file",
    description:
      "Puts a file that is not an image into the project's assets — a video for a code component's File control, a PDF, a font — and returns its url. Pass exactly one of: url (https, Framer downloads it) or path (absolute path to a local mp4, m4v, mov, webm, pdf, woff, woff2, ttf or otf). Images go through image_upload.",
    input: z.strictObject({
      url: z.string().min(1).exactOptional(),
      path: z.string().min(1).exactOptional(),
      name: z.string().min(1).exactOptional(),
    }),
    output: fileUpload.output.extend({ activity: ActivityNoteSchema }),
    annotations: operationAnnotations(fileUpload),
    run: async ({ url, path, name }): Promise<z.output<typeof fileUpload.output> & { activity: ActivityNote }> =>
      runOperationTool(context, "file_upload", fileUpload, {
        url: await fileSourceOf({
          url,
          path,
        }),
        ...(name === undefined ? {} : { name }),
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
      'Finds icons by name across Framer\'s icon sets (Phosphor, Lucide, Material, Feather, Logos for brand logos…) and returns the set ids, exact icon names and each set\'s controls. Insert with +IconNode set="<setId>" $control__icon="<exact name>"; never guess names. For an icon no set has, draw it as SVG (image_upload svg or svg_add). Needs the project\'s Server API key (framer_status shows whether it is set).',
  });

  addOperationTool(server, context, shadersRead, {
    name: "shaders_read",
    title: "List shaders",
    description:
      'Lists Framer\'s shaders, animated backgrounds placed as a ShaderNode (liquid-gradient, mesh, wave-gradient, fluted-glass over a photo, particles…): which the site uses (onSite) and which it may add. Pass names to read their controls (colors up to 8, speed, scale, seed…) before placing one: <ShaderNode shader="<name>" $control__colors.0="var(--token-<id>)" …/> in an absolute Background frame pinned to all sides, with a shade above it for text. Tint it with the palette\'s base and ink tones and one second hue, never the action accent; a token follows dark mode. One shader per page. Needs the project\'s Server API key.',
  });
}
