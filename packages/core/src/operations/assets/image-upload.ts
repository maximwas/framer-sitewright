import * as z from "zod";
import { defineOperation } from "../define.ts";

export const imageUpload = defineOperation({
  name: "images.upload",
  effect: "write",
  idempotent: false,
  // uploadImage needs no permission in the plugin.
  permissions: [],
  input: z.strictObject({
    image: z.string().min(1).describe("An https URL or a data URL (SVG included)."),
    name: z.string().min(1).exactOptional(),
    altText: z.string().exactOptional(),
  }),
  output: z.object({
    id: z.string(),
    url: z.string(),
  }),
  async run({ runtime }, { image, name, altText }) {
    const asset = await runtime.port.uploadImage({
      image,
      ...(name === undefined ? {} : { name }),
      ...(altText === undefined ? {} : { altText }),
    });

    return {
      id: asset.id,
      url: asset.url,
    };
  },
  describe({ name }, { url }) {
    return {
      subject: name ?? null,
      images: [url],
    };
  },
});
