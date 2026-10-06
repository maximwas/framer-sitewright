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
import { fetchScreenshotImage } from "../../assets/screenshot-image.ts";
import { COMPONENT_EXPORT_ERROR, MAX_IMAGE_SIDE_PX } from "../../constants/mcp.ts";
import { ScreenshotInputSchema } from "../../schemas/mcp.ts";
import type { ImageSize, ToolContext } from "../../types/mcp.ts";
import { operationAnnotations } from "../add-tool.ts";
import { describeError } from "../describe-error.ts";
import { readPngSize } from "../png-size.ts";

/** No outputSchema on purpose: Claude Code would drop the image block and show only structuredContent. */
export function registerScreenshotTools(server: McpServer, context: ToolContext): void {
  registerNodeScreenshotTool(server, context);
  registerReferenceScreenshotTool(server, context);
}

function registerNodeScreenshotTool(server: McpServer, { transports, journal }: ToolContext): void {
  server.registerTool(
    "node_screenshot",
    {
      title: "Screenshot a node",
      description:
        "Renders a node (breakpoint, section, component variant) to PNG so you can verify the visual result. Needs the project's Server API key. Images longer than 2000 px on a side are refused: capture a region with clip, or use scale 0.5.",
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
                assertFitsModel(taken.data);

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
      description: `Screenshots any public web page in Framer's browser: a reference site the user likes, a competitor's, or the published site (its URL is in publish_preview or publish_status). Use it to study a reference's layout, spacing, type and rhythm before designing, or to check the live site after a publish. The capture is the whole page at the window width given (390 for a phone, 810 for a tablet, default 1200), light or dark. A page longer than ${MAX_IMAGE_SIDE_PX} px comes scaled down to fit (a tall page gets narrow), and the text gives the full size and the full-size image's URL to open in a browser. Local, private and login-only pages cannot be captured: ask the user for a screenshot instead. Needs the project's Server API key. Returns the image and a line with its sizes and URL.`,
      inputSchema: referenceScreenshot.input,
      annotations: operationAnnotations(referenceScreenshot),
    },
    async (args) => {
      try {
        const { output } = await journal.run("reference_screenshot", referenceScreenshot, args);
        const image = await fetchScreenshotImage(output.imageUrl);

        return {
          content: [
            {
              type: "image",
              data: Buffer.from(image.data).toString("base64"),
              mimeType: image.mimeType,
            },
            {
              type: "text",
              text: referenceLine(output.url, output.viewport.width, image.size, image.shown, output.imageUrl),
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

function assertFitsModel(png: Uint8Array): void {
  const size = readPngSize(png);

  if (size === null || Math.max(size.width, size.height) <= MAX_IMAGE_SIDE_PX) {
    return;
  }

  throw new OperationError(
    "RESULT_TOO_LARGE",
    `The screenshot is ${size.width}×${size.height} px; the model takes images up to ${MAX_IMAGE_SIDE_PX} px on the longer side.`,
    "Capture part of the node with clip { x, y, width, height }, or use scale 0.5.",
  );
}
