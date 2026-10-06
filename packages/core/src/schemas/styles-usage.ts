import * as z from "zod";

export const StyleUsageSchema = z.object({
  id: z.string(),
  path: z.string(),
  /** Layers that use it, each once however many breakpoints or variants show it. */
  layers: z.number().int(),
  /** Pages by path, and "component <name>", "design page <name>" or "layout <name>". */
  usedIn: z.array(z.string()),
});

export const TokenUsageSchema = StyleUsageSchema.extend({
  /** Text and link styles that bind the token: it is in use wherever they are. */
  styles: z.array(z.string()),
});

export const StylesUsageOutputSchema = z.object({
  /** "site", or the one page read. */
  scope: z.string(),
  tokens: z.object({
    used: z.array(TokenUsageSchema),
    unused: z.array(z.string()),
  }),
  textStyles: z.object({
    used: z.array(StyleUsageSchema),
    unused: z.array(z.string()),
  }),
  linkStyles: z.object({
    used: z.array(StyleUsageSchema),
    unused: z.array(z.string()),
  }),
  note: z.string().nullable(),
});
