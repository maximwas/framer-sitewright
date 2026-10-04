import * as z from "zod";

export const ColorTokenInputSchema = z.strictObject({
  path: z.string().min(1).describe('Token path with "/" folders, e.g. "Brand/Primary".'),
  light: z.string().min(1).describe("Light-mode color: hex, rgb(), hsl(), oklch() or a CSS name."),
  dark: z
    .string()
    .min(1)
    .nullable()
    .exactOptional()
    .describe("Dark-mode color. null removes it; omit to keep the current value."),
});

export const ColorTokenSchema = z.object({
  id: z.string(),
  path: z.string(),
  light: z.string(),
  dark: z.string().nullable(),
});
