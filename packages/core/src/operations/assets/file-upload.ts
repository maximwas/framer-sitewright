import * as z from "zod";
import { defineOperation } from "../define.ts";

/** Puts a file (a video for a code component, a PDF, a font) into the project's assets: Framer fetches the URL. */
export const fileUpload = defineOperation({
  name: "files.upload",
  effect: "write",
  idempotent: false,
  // uploadFile needs no permission in the plugin.
  permissions: [],
  input: z.strictObject({
    url: z.url({ protocol: /^https$/ }).describe("An https URL of the file; Framer downloads it into the project."),
    name: z.string().min(1).exactOptional().describe('Name of the asset, e.g. "hero-bottle.webm".'),
  }),
  output: z.object({
    id: z.string(),
    url: z.string(),
    extension: z.string().nullable(),
  }),
  async run({ runtime, history }, { url, name }) {
    const asset = await runtime.port.uploadFile({
      file: url,
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
      subject: name ?? url,
      summary: uploaded,
    };
  },
});
