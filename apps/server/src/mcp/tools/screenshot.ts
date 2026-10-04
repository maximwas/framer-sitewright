import type { McpServer } from "@modelcontextprotocol/server";
import { nodeNameOf, OperationError, requireScreenshot, type ScreenshotOptions } from "@sitewright/core";
import { MAX_IMAGE_SIDE_PX } from "../../constants/mcp.ts";
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
        "Renders a node (breakpoint, section, component variant) to PNG so you can verify the visual result. Server API transport only. Images longer than 2000 px on a side are refused: capture a region with clip, or use scale 0.5.",
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
        const { shot } = await journal.read(
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
                const taken = await requireScreenshot(runtime)(nodeId, options);

                // Inside the read, so a refused screenshot is journaled as failed.
                assertFitsModel(taken.data);

                // The panel names the node; an id alone means nothing to the user.
                return {
                  shot: taken,
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
              text: `Screenshot of node ${nodeId} (${shot.data.length} bytes, scale ${scale}).`,
            },
          ],
        };
      } catch (error) {
        throw new Error(describeError(error), { cause: error });
      }
    },
  );
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
