import * as z from "zod";
import {
  DEFAULT_VIEWPORT,
  PHONE_MAX_WIDTH,
  PHONE_VIEWPORT_HEIGHT,
  SCREENSHOT_QUERY_TYPE,
  VIEWPORT_HEIGHT_RANGE,
  VIEWPORT_WIDTH_RANGE,
} from "../../constants/screenshots.ts";
import { OperationError } from "../../errors.ts";
import { requireAgent } from "../../framer/runtime.ts";
import { UrlScreenshotAnswerSchema } from "../../schemas/screenshots.ts";
import { isPublicWebUrl } from "../../utils/url.ts";
import { defineOperation } from "../define.ts";

/**
 * A full-page screenshot of any public web page, taken by Framer (the readProject "screenshot" query, Server API only):
 * a reference site, or the published site. Framer answers with a JPEG on its CDN; the MCP tool fetches it.
 */
export const referenceScreenshot = defineOperation({
  name: "site.screenshot",
  effect: "read",
  idempotent: true,
  permissions: [],
  needsAgent: true,
  input: z.strictObject({
    url: z.string().min(1).describe('A public http(s) page, e.g. "https://example.com/pricing".'),
    width: z
      .number()
      .int()
      .min(VIEWPORT_WIDTH_RANGE[0])
      .max(VIEWPORT_WIDTH_RANGE[1])
      .exactOptional()
      .describe(`Browser width in px: 390 for a phone, 810 for a tablet. Default ${DEFAULT_VIEWPORT.width}.`),
    height: z
      .number()
      .int()
      .min(VIEWPORT_HEIGHT_RANGE[0])
      .max(VIEWPORT_HEIGHT_RANGE[1])
      .exactOptional()
      .describe(
        `Browser height in px, which sizes 100vh sections; the capture is the whole page anyway. Default ${DEFAULT_VIEWPORT.height}, ${PHONE_VIEWPORT_HEIGHT} below ${PHONE_MAX_WIDTH} wide.`,
      ),
    theme: z.enum(["light", "dark"]).default("light").describe("The color scheme the page is opened in."),
  }),
  output: z.object({
    url: z.string(),
    /** The full-size JPEG on Framer's CDN. */
    imageUrl: z.string(),
    theme: z.enum(["light", "dark"]),
    viewport: z.object({
      width: z.number().int(),
      height: z.number().int(),
    }),
  }),
  async run({ runtime }, { url, width = DEFAULT_VIEWPORT.width, height, theme }) {
    if (!isPublicWebUrl(url)) {
      throw new OperationError(
        "INVALID_INPUT",
        `Framer captures only public http(s) pages, not ${url}.`,
        "For a local or private page, ask the user for a screenshot.",
      );
    }

    const viewport = {
      width,
      height: height ?? (width < PHONE_MAX_WIDTH ? PHONE_VIEWPORT_HEIGHT : DEFAULT_VIEWPORT.height),
    };
    const answer = UrlScreenshotAnswerSchema.parse(
      await requireAgent(runtime).readProject([
        {
          type: SCREENSHOT_QUERY_TYPE,
          url,
          viewport,
          theme,
        },
      ]),
    );
    const [result] = answer.results;

    if (result?.image_url === undefined) {
      throw new OperationError(
        "NOT_FOUND",
        `Framer could not capture ${url}${result?.error === undefined ? "" : `: ${result.error}`}.`,
        "Pages behind a login, slow pages and sites that block bots fail; check the address, or ask the user for a screenshot.",
      );
    }

    return {
      url,
      imageUrl: result.image_url,
      theme,
      viewport,
    };
  },
  describe({ url }, { viewport, theme, imageUrl }) {
    return {
      subject: url,
      summary: `${viewport.width}×${viewport.height}${theme === "dark" ? ", dark" : ""}`,
      // The journal panel previews what the AI looked at.
      images: [imageUrl],
    };
  },
});
