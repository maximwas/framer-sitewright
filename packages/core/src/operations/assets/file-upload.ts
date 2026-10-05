import * as z from "zod";
import { FILE_DATA_URL_BRIDGE_MAX } from "../../constants/assets.ts";
import { OperationError } from "../../errors.ts";
import { dataUrlBytes } from "../../utils/data-url.ts";
import { defineOperation } from "../define.ts";

/** Puts a file (a video for a code component, a PDF, a font) into the project's assets: Framer fetches the URL. */
export const fileUpload = defineOperation({
  name: "files.upload",
  effect: "write",
  idempotent: false,
  // uploadFile needs no permission in the plugin.
  permissions: [],
  // A local file too big for one message of the plugin bridge goes up through the Server API of the same project.
  needsAgent: ({ url }) => url.startsWith("data:") && url.length > FILE_DATA_URL_BRIDGE_MAX,
  input: z.strictObject({
    url: z
      .string()
      .refine((value) => value.startsWith("https://") || value.startsWith("data:"), "An https URL or a data URL.")
      .describe("An https URL Framer downloads into the project, or a data URL of a local file."),
    name: z.string().min(1).exactOptional().describe('Name of the asset, e.g. "hero-bottle.webm".'),
  }),
  output: z.object({
    id: z.string(),
    url: z.string(),
    extension: z.string().nullable(),
  }),
  async run({ runtime, history }, { url, name }) {
    // Framer downloads a URL itself but cannot fetch a data URL ("Connection error", spike 18): a local file goes as bytes.
    const file = url.startsWith("data:") ? dataUrlBytes(url) : url;

    if (file === null) {
      throw new OperationError("INVALID_INPUT", "The data URL is not base64: data:<type>;base64,<data>.");
    }

    const asset = await runtime.port.uploadFile({
      file,
      ...(name === undefined ? {} : { name }),
    });

    history?.markIncomplete("Uploaded a file: undo leaves it in the project's assets.");

    return {
      id: asset.id,
      url: asset.url,
      extension: asset.extension,
    };
  },
  describe({ name, url }, { url: uploaded }) {
    return {
      // Never the data itself: a local file's data URL is megabytes long.
      subject: name ?? (url.startsWith("data:") ? "Local file" : url),
      summary: uploaded,
    };
  },
});
