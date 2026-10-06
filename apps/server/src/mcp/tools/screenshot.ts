import type { McpServer } from "@modelcontextprotocol/server";
import {
  errorMessage,
  type FramerRuntime,
  nodeNameOf,
  OperationError,
  requireScreenshot,
  type ScreenshotOptions,
} from "@sitewright/core";
import { COMPONENT_EXPORT_ERROR, MAX_IMAGE_SIDE_PX } from "../../constants/mcp.ts";
import { ScreenshotInputSchema } from "../../schemas/mcp.ts";
import type { ToolContext } from "../../types/mcp.ts";
import { describeError } from "../describe-error.ts";
import { readPngSize } from "../png-size.ts";

/** No outputSchema on purpose: Claude Code would drop the image block and show only structuredContent. */
export function registerScreenshotTool(server: McpServer, { transports, journal }: ToolContext): void {
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
