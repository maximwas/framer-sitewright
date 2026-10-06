import * as z from "zod";
import type { FramerPort } from "../../types/framer-port.ts";
import { countOf } from "../../utils/text.ts";
import { defineOperation } from "../define.ts";

/**
 * Which of these families Framer's font library has, so a text style can use them without an upload. One lookup per
 * family, not a scan of the ~9.5k fonts (which takes over 30 s through the plugin).
 */
export const fontsInLibrary = defineOperation({
  name: "fonts.inLibrary",
  effect: "read",
  idempotent: true,
  permissions: [],
  input: z.strictObject({
    families: z.array(z.string().min(1)).min(1).max(30),
  }),
  output: z.object({
    families: z.array(
      z.object({
        family: z.string(),
        inLibrary: z.boolean(),
      }),
    ),
  }),
  async run({ runtime }, { families }) {
    return {
      families: await Promise.all(
        families.map(async (family) => ({
          family,
          inLibrary: await inLibrary(runtime.port, family),
        })),
      ),
    };
  },
  describe(_input, { families }) {
    return {
      subject: countOf(families.length, "family", "families"),
      summary: `${countOf(families.filter(({ inLibrary }) => inLibrary).length, "family", "families")} in Framer's library`,
    };
  },
});

async function inLibrary(port: FramerPort, family: string): Promise<boolean> {
  try {
    return (
      (await port.getFont(family, {
        weight: 400,
        style: "normal",
      })) !== null || (await port.getFont(family)) !== null
    );
  } catch {
    return false;
  }
}
