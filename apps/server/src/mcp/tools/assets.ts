import { basename, extname } from "node:path";
import type { McpServer } from "@modelcontextprotocol/server";
import {
  type ActivityNote,
  ActivityNoteSchema,
  errorMessage,
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
import { fitSvg, svgMarkupOf } from "../../assets/svg-source.ts";
import { IMAGES_UPLOAD_MAX } from "../../constants/assets.ts";
import type { ToolContext } from "../../types/mcp.ts";
import { addOperationTool, addTool, operationAnnotations, runOperationTool } from "../add-tool.ts";

export function registerAssetTools(server: McpServer, context: ToolContext): void {
  addTool(server, {
    name: "image_upload",
    title: "Upload an image",
    description:
      "Uploads an image to the project's assets and returns its url, for a fill, a logo or a favicon. Pass exactly one of: url (https), path (a local png, jpg, gif, webp, avif or svg; absolute, or relative to the project folder the server runs in), or svg (SVG markup: own icons, logos and illustrations drawn as vectors). Several local files at once: images_upload.",
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
    name: "images_upload",
    title: "Upload images",
    description: `Uploads up to ${IMAGES_UPLOAD_MAX} local images in one call (png, jpg, gif, webp, avif or svg; paths absolute or relative to the project folder the server runs in), each named after its file, and returns every path with its url. A file that fails is listed in failed with why; the others still upload.`,
    input: z.strictObject({
      paths: z.array(z.string().min(1)).min(1).max(IMAGES_UPLOAD_MAX),
    }),
    output: z.object({
      images: z.array(imageUpload.output.extend({ path: z.string() })),
      failed: z.array(
        z.object({
          path: z.string(),
          error: z.string(),
        }),
      ),
      activity: ActivityNoteSchema,
    }),
    annotations: operationAnnotations(imageUpload),
    run: async ({ paths }) => {
      const images: { path: string; id: string; url: string }[] = [];
      const failed: { path: string; error: string }[] = [];
      let activity: ActivityNote | null = null;
      let firstError: unknown = null;

      // One after another: each file is one upload and one journal entry, like image_upload.
      for (const path of paths) {
        try {
          const uploaded = await runOperationTool(context, "images_upload", imageUpload, {
            image: await imageSourceOf({ path }),
            name: basename(path, extname(path)),
          });

          images.push({
            path,
            id: uploaded.id,
            url: uploaded.url,
          });
          activity = uploaded.activity;
        } catch (error) {
          firstError ??= error;
          failed.push({
            path,
            error: errorMessage(error),
          });
        }
      }

      if (activity === null) {
        throw firstError;
      }

      return {
        images,
        failed,
        activity,
      };
    },
  });

  addTool(server, {
    name: "file_upload",
    title: "Upload a file",
    description:
      "Puts a file that is not an image into the project's assets — a video for a code component's File control, a PDF, a font — and returns its url. Pass exactly one of: url (https, Framer downloads it) or path (a local mp4, m4v, mov, webm, pdf, woff, woff2, ttf or otf; absolute, or relative to the project folder the server runs in). Images go through image_upload.",
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

  addTool(server, {
    name: "svg_add",
    title: "Add an SVG layer",
    description: `Adds an SVG as an editable vector layer — own icons, logos, illustrations — from markup (svg) or an .svg file (path, absolute or relative to the project folder), and returns the new layer's id (nodeIds). Framer sizes it by the root's width and height and crops it to the drawing: width sets the layer's width (height follows the viewBox), keepViewBox keeps the empty space around the drawing. Without parentId Framer puts it into the layer selected in the editor; with it, it moves there. To reuse a logo or icon across the site, ask the user to add the layer to a project vector set (Vectors panel; the API cannot), then place it as an IconNode of that set. Works through the ${PRODUCT.title} plugin only.`,
    input: svgAdd.input.omit({ svg: true }).extend({
      svg: z.string().min(1).exactOptional().describe("SVG markup with a viewBox."),
      path: z.string().min(1).exactOptional().describe("An .svg file, instead of svg."),
      width: z.number().positive().exactOptional().describe("Layer width in px; the height follows the viewBox."),
      keepViewBox: z
        .boolean()
        .exactOptional()
        .describe("Keep the viewBox's empty space around the drawing, as an icon's padding."),
    }),
    output: svgAdd.output.extend({
      activity: ActivityNoteSchema,
      support: z.string().exactOptional(),
    }),
    annotations: operationAnnotations(svgAdd),
    run: async ({ svg, path, width, keepViewBox, name, ...placement }) =>
      runOperationTool(context, "svg_add", svgAdd, {
        svg: fitSvg(
          await svgMarkupOf({
            svg,
            path,
          }),
          {
            width,
            keepViewBox,
          },
        ),
        ...placement,
        ...(name === undefined && path !== undefined ? { name: basename(path, extname(path)) } : {}),
        ...(name === undefined ? {} : { name }),
      }),
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
