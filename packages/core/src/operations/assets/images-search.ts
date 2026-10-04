import * as z from "zod";
import { IMAGE_ORIENTATIONS } from "../../constants/assets.ts";
import { requireAgent } from "../../framer/runtime.ts";
import { ImageCandidatesSchema } from "../../schemas/assets.ts";
import { countOf } from "../../utils/text.ts";
import { defineOperation } from "../define.ts";

export const imagesSearch = defineOperation({
  name: "images.search",
  effect: "read",
  idempotent: true,
  permissions: [],
  needsAgent: true,
  input: z.strictObject({
    query: z.string().min(2).describe('What the photo shows, e.g. "white ceramic vases on a table".'),
    count: z.number().int().min(1).max(12).default(4),
    orientation: z.enum(IMAGE_ORIENTATIONS).exactOptional(),
    width: z
      .number()
      .int()
      .min(100)
      .max(4000)
      .exactOptional()
      .describe("Twice the display width of the frame the image fills, for sharp images on dense screens."),
  }),
  output: z.object({
    images: z.array(
      z.object({
        url: z.string(),
        alt: z.string().nullable(),
        width: z.number().nullable(),
        height: z.number().nullable(),
        color: z.string().nullable(),
      }),
    ),
  }),
  async run({ runtime }, { query, count, orientation, width }) {
    const found = await requireAgent(runtime).queryImages({
      source: "unsplash",
      query,
      count,
      ...(orientation === undefined ? {} : { orientation }),
      ...(width === undefined ? {} : { width }),
    });

    return {
      images: ImageCandidatesSchema.parse(found).map((image) => ({
        url: image.url,
        alt: image.alt ?? null,
        width: image.width ?? null,
        height: image.height ?? null,
        color: image.color ?? null,
      })),
    };
  },
  describe({ query }, { images }) {
    return {
      subject: `“${query}”`,
      summary: countOf(images.length, "photo"),
      images: images.map(({ url }) => url),
    };
  },
});
