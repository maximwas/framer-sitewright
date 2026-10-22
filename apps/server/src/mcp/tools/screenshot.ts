import type { McpServer } from "@modelcontextprotocol/server";
import {
  errorMessage,
  type FramerRuntime,
  nodeNameOf,
  OperationError,
  referenceScreenshot,
  requireScreenshot,
  type ScreenshotOptions,
} from "@sitewright/core";
import * as z from "zod";
import { fetchScreenshotImage, fetchScreenshotPart } from "../../assets/screenshot-image.ts";
import { COMPONENT_EXPORT_ERROR, MAX_IMAGE_SIDE_PX } from "../../constants/mcp.ts";
import { diffEdges, edgesOf } from "../../images/edge-diff.ts";
import { decodePng } from "../../images/png-decode.ts";
import { referenceBytes } from "../../images/reference-image.ts";
import { ImageCompareInputSchema, ScreenshotInputSchema } from "../../schemas/mcp.ts";
import type { ImageSize, ToolContext } from "../../types/mcp.ts";
import { operationAnnotations } from "../add-tool.ts";
import { describeError } from "../describe-error.ts";
import { readPngSize } from "../png-size.ts";

/** No outputSchema on purpose: Claude Code would drop the image block and show only structuredContent. */
export function registerScreenshotTools(server: McpServer, context: ToolContext): void {
  registerNodeScreenshotTool(server, context);
  registerReferenceScreenshotTool(server, context);
  registerImageCompareTool(server, context);
}

/**
 * A node against a reference image (a Figma export): where their lines and edges differ, by row and column, so a node
 * can be lined up with its design to the pixel without reading pixels by hand (seen 12.10.2026).
 */
function registerImageCompareTool(server: McpServer, { transports, journal }: ToolContext): void {
  server.registerTool(
    "image_compare",
    {
      title: "Compare a node with a reference image",
      description:
        "Captures a node like node_screenshot and compares it with a reference PNG (a Figma export, by absolute path or https URL): the y of every horizontal line or edge and the x of every vertical one, paired between the two. The answer lists edges that match, edges off by a few px (where each is, and by how much the node's is off: positive is lower or further right), edges of the reference the node lacks, and edges only the node has. Export the reference at the same scale and size as the capture (clip and scale work as in node_screenshot). Needs the project's Server API key.",
      inputSchema: ImageCompareInputSchema,
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ nodeId, scale, clip, reference }) => {
      const options: ScreenshotOptions = {
        format: "png",
        scale,
        ...(clip === undefined ? {} : { clip }),
      };

      try {
        const result = await journal.read(
          "image_compare",
          "Compare with reference",
          "server-api",
          () => ({
            subject: `Scale ${scale}`,
            nodes: [
              {
                id: nodeId,
                name: nodeId,
              },
            ],
          }),
          () =>
            transports.withServerApi(
              async (runtime) => {
                const { taken } = await capture(runtime, nodeId, options);
                const node = decodePng(taken.data);
                const wanted = decodePng(await referenceBytes(reference));
                const ours = edgesOf(node);
                const theirs = edgesOf(wanted);

                return {
                  size: {
                    node: `${node.width}×${node.height}`,
                    reference: `${wanted.width}×${wanted.height}`,
                  },
                  rows: diffEdges(theirs.rows, ours.rows),
                  columns: diffEdges(theirs.columns, ours.columns),
                };
              },
              { sameProjectAsActive: true },
            ),
        );
        const sameSize = result.size.node === result.size.reference;

        return {
          content: [
            {
              type: "text",
              text: `${sameSize ? "" : `The sizes differ (node ${result.size.node}, reference ${result.size.reference}): export the reference at the capture's scale and size, or edges are off by the difference. `}${JSON.stringify(result)}`,
            },
          ],
        };
      } catch (error) {
        throw new Error(describeError(error), { cause: error });
      }
    },
  );
}

function registerNodeScreenshotTool(server: McpServer, { transports, journal }: ToolContext): void {
  server.registerTool(
    "node_screenshot",
    {
      title: "Screenshot a node",
      description:
        "Renders a node (breakpoint, section, component variant) to PNG so you can verify the visual result. Needs the project's Server API key. Images longer than 2000 px on a side are refused: capture a region with clip, or use scale 0.5. On a CMS detail page Framer draws the Tablet and Phone breakpoints with the components' default content, not the CMS item: check those on the published page (reference_screenshot of its URL).",
      inputSchema: ScreenshotInputSchema,
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ nodeId, scale, clip }) => {
      const options: ScreenshotOptions = {
        format: "png",
        scale,
        ...(clip === undefined ? {} : { clip }),
      };

      try {
        const { shot, capturedId } = await journal.read(
          "node_screenshot",
          "Screenshot",
          "server-api",
          (result) => ({
            subject:
              clip === undefined
                ? `Scale ${scale}`
                : `Region ${clip.width}×${clip.height} at ${clip.x}, ${clip.y}, scale ${scale}`,
            nodes: [
              {
                id: nodeId,
                name: result?.name ?? nodeId,
              },
            ],
          }),
          () =>
            transports.withServerApi(
              async (runtime) => {
                const { taken, capturedId } = await capture(runtime, nodeId, options);

                // Inside the read, so a refused screenshot is journaled as failed.
                assertFitsModel(taken.data, scale);

                // The panel names the node; an id alone means nothing to the user.
                return {
                  shot: taken,
                  capturedId,
                  name: nodeNameOf(await runtime.port.getNode(nodeId).catch(() => null)),
                };
              },
              { sameProjectAsActive: true },
            ),
        );

        return {
          content: [
            {
              type: "image",
              data: Buffer.from(shot.data).toString("base64"),
              mimeType: shot.mimeType,
            },
            {
              type: "text",
              text:
                capturedId === nodeId
                  ? `Screenshot of node ${nodeId} (${shot.data.length} bytes, scale ${scale}).`
                  : `A component cannot be captured whole: this is its primary variant ${capturedId} (${shot.data.length} bytes, scale ${scale}). Capture another variant by its id; nodes_read on the component lists them.`,
            },
          ],
        };
      } catch (error) {
        throw new Error(describeError(error), { cause: error });
      }
    },
  );
}

/** A screenshot of a public web page, taken by Framer's browser: the operation asks Framer, this fetches the JPEG. */
function registerReferenceScreenshotTool(server: McpServer, { journal }: ToolContext): void {
  server.registerTool(
    "reference_screenshot",
    {
      title: "Screenshot a web page",
      description: `Screenshots any public web page in Framer's browser: a reference site the user likes, a competitor's, or the published site (its URL is in publish_preview or publish_status). Use it to study a reference's layout, spacing, type and rhythm before designing, or to check the live site after a publish. The capture is the whole page at the window width given (390 for a phone, 810 for a tablet, default 1200), light or dark. A page longer than ${MAX_IMAGE_SIDE_PX} px comes scaled down to fit (a tall page gets narrow): read it in bands at full width with part { top, height } in the page's px, the text gives the page's full size. Local, private and login-only pages cannot be captured: ask the user for a screenshot instead. Needs the project's Server API key. Returns the image and a line with its sizes and URL.`,
      inputSchema: referenceScreenshot.input.extend({
        part: z
          .strictObject({
            top: z.number().min(0),
            height: z.number().positive(),
          })
          .exactOptional()
          .describe("One band of the page, in its CSS px: e.g. { top: 0, height: 1800 }, then top 1800."),
      }),
      annotations: operationAnnotations(referenceScreenshot),
    },
    async ({ part, ...args }) => {
      try {
        const { output } = await journal.run("reference_screenshot", referenceScreenshot, args);
        const image =
          part === undefined
            ? await fetchScreenshotImage(output.imageUrl)
            : await fetchScreenshotPart(output.imageUrl, part, output.viewport.width);

        return {
          content: [
            {
              type: "image",
              data: Buffer.from(image.data).toString("base64"),
              mimeType: image.mimeType,
            },
            {
              type: "text",
              text: `${referenceLine(output.url, output.viewport.width, image.size, image.shown, output.imageUrl)}${
                part === undefined ? "" : ` This is the band from ${part.top} px, ${part.height} px tall.`
              }`,
            },
          ],
        };
      } catch (error) {
        throw new Error(describeError(error), { cause: error });
      }
    },
  );
}

/** What the model needs to read the image: the page's real size, how it is shown, and where the full size is. */
function referenceLine(
  url: string,
  width: number,
  size: ImageSize | null,
  shown: ImageSize | null,
  imageUrl: string,
): string {
  const sizeText = (value: ImageSize) => `${value.width}×${value.height} px`;
  const whole = size === null ? "the whole page" : `the whole page, ${sizeText(size)}`;
  const scaled =
    size !== null && shown !== null && (shown.width !== size.width || shown.height !== size.height)
      ? `, shown scaled down to ${sizeText(shown)}`
      : "";

  return `Screenshot of ${url} in a ${width} px wide window: ${whole}${scaled}. Full size: ${imageUrl}`;
}

/** Framer cannot export a component node itself, only its variants: the first one is the primary. */
async function capture(runtime: FramerRuntime, nodeId: string, options: ScreenshotOptions) {
  const screenshot = requireScreenshot(runtime);

  try {
    return {
      taken: await screenshot(nodeId, options),
      capturedId: nodeId,
    };
  } catch (error) {
    const [primary] = COMPONENT_EXPORT_ERROR.test(errorMessage(error)) ? await runtime.port.getChildren(nodeId) : [];

    if (primary === undefined) {
      throw error;
    }

    return {
      taken: await screenshot(primary.id, options),
      capturedId: primary.id,
    };
  }
}

export function assertFitsModel(png: Uint8Array, scale: number): void {
  const size = readPngSize(png);

  if (size === null || Math.max(size.width, size.height) <= MAX_IMAGE_SIDE_PX) {
    return;
  }

  // At 0.5 there is no smaller scale to offer: only parts (seen: "use scale 0.5" said at scale 0.5).
  const band = Math.floor(MAX_IMAGE_SIDE_PX / scale);

  throw new OperationError(
    "RESULT_TOO_LARGE",
    `The screenshot is ${size.width}×${size.height} px at scale ${scale}; the model takes images up to ${MAX_IMAGE_SIDE_PX} px on the longer side.`,
    `Capture it in parts with clip { x, y, width, height }, up to ${band} px of the node at a time${scale > 0.5 ? ", or use scale 0.5" : ""}.`,
  );
}
