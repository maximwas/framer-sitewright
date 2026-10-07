import type { McpServer } from "@modelcontextprotocol/server";
import {
  CODE_TEMPLATES,
  FONT_MOODS,
  FONT_PAIRINGS,
  FONTS_BY_MOOD,
  framerRead,
  OperationError,
  PALETTE_SCHEMES,
  paletteOf,
  sectionBuild,
  typeScaleGenerate,
} from "@sitewright/core";
import * as z from "zod";
import type { ToolContext } from "../../types/mcp.ts";
import { addOperationTool, addTool } from "../add-tool.ts";

const LOCAL = {
  readOnlyHint: true,
  idempotentHint: true,
  openWorldHint: false,
} as const;

export function registerGeneratorTools(server: McpServer, context: ToolContext): void {
  addTool(server, {
    name: "palette_generate",
    title: "Generate a palette",
    description:
      "Builds five colors around a base color for a scheme (monochromatic, shades, analogous, complementary, splitComplementary, triadic, tetradic) and returns them with a Coolors and a Realtime Colors link to show the user. A starting point: take the final colors from the concept's world, check them with contrast_check, then save them as tokens with color_tokens_upsert.",
    input: z.strictObject({
      base: z
        .string()
        .regex(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
        .describe("The base color, #rrggbb."),
      scheme: z.enum(PALETTE_SCHEMES).default("analogous"),
    }),
    output: z.object({
      colors: z.array(z.string()),
      coolors: z.string(),
      realtimeColors: z.string(),
    }),
    annotations: LOCAL,
    run: async ({ base, scheme }) => {
      const colors = paletteOf(base, scheme);

      if (colors === null) {
        throw new OperationError("INVALID_INPUT", `${base} is not a #rrggbb color.`);
      }

      const hex = colors.map((color) => color.slice(1));
      const [main, second, third, , dark] = hex;
      const light = [...hex].sort().at(-1) ?? "ffffff";

      return {
        colors,
        coolors: `https://coolors.co/${hex.join("-")}`,
        realtimeColors: `https://www.realtimecolors.com/?colors=${dark ?? "111111"}-${light}-${main}-${second}-${third}`,
      };
    },
  });
  addTool(server, {
    name: "fonts_pair",
    title: "Suggest font pairs",
    description:
      "Lists heading and body pairs typographers rely on, all on Google Fonts and in Framer's library, by mood (editorial, modern, bold, technical, playful, luxury, warm, minimal, developer, fashion) and contrast (high, medium, subtle). Pick from the concept, then check the language's signs with fonts_discover before using one.",
    input: z.strictObject({
      mood: z.enum(FONT_MOODS).exactOptional(),
      contrast: z.enum(["high", "medium", "subtle"]).exactOptional(),
    }),
    output: z.object({
      pairs: z.array(
        z.object({
          heading: z.string(),
          body: z.string(),
          moods: z.array(z.string()),
          contrast: z.string(),
        }),
      ),
    }),
    annotations: LOCAL,
    run: async ({ mood, contrast }) => ({
      pairs: FONT_PAIRINGS.filter(
        (pair) =>
          (mood === undefined || (pair.moods as readonly string[]).includes(mood)) &&
          (contrast === undefined || pair.contrast === contrast),
      ).map((pair) => ({
        ...pair,
        moods: [...pair.moods],
      })),
    }),
  });
  addTool(server, {
    name: "fonts_by_mood",
    title: "Find fonts by mood",
    description:
      "Lists Google Fonts families (in Framer's library) for a mood, each with the role it plays best (heading, body or both) and the weights to start from. For any family by name use fonts_search; beyond Framer's library, fonts_discover.",
    input: z.strictObject({
      mood: z.enum(FONT_MOODS),
      role: z.enum(["heading", "body", "both"]).exactOptional(),
    }),
    output: z.object({
      fonts: z.array(
        z.object({
          family: z.string(),
          role: z.string(),
          weights: z.array(z.number()),
        }),
      ),
    }),
    annotations: LOCAL,
    run: async ({ mood, role }) => ({
      fonts: FONTS_BY_MOOD.filter(
        (font) =>
          (font.moods as readonly string[]).includes(mood) &&
          (role === undefined || font.role === role || font.role === "both"),
      ).map(({ family, role: plays, weights }) => ({
        family,
        role: plays,
        weights: [...weights],
      })),
    }),
  });
  addTool(server, {
    name: "component_templates",
    title: "List code component templates",
    description: "Lists the ready code components component_template_insert can add: what each does and its file.",
    input: z.strictObject({}),
    output: z.object({
      templates: z.array(
        z.object({
          name: z.string(),
          file: z.string(),
          about: z.string(),
        }),
      ),
    }),
    annotations: LOCAL,
    run: async () => ({
      templates: Object.entries(CODE_TEMPLATES).map(([name, { file, about }]) => ({
        name,
        file,
        about,
      })),
    }),
  });
  addOperationTool(server, context, typeScaleGenerate, {
    name: "type_scale_generate",
    title: "Generate a type scale",
    description:
      "Works out a type scale from a body size and a ratio (Display, Heading L, M, S, XS, Body and Caption, with line heights and tracking that tighten as sizes grow) in the fonts you give. apply true writes them as text styles, headings balanced; false only proposes them. Give text styles their breakpoint sizes afterwards (text_styles_upsert).",
  });
  addOperationTool(server, context, sectionBuild, {
    name: "section_build",
    title: "Build a section",
    description:
      "Builds a hero, a closing call to action or a features grid in one call, in the site's own system: its heading and body text styles, its text, surface and accent tokens, Section > Container > Content on the site's content width, every stack with its alignment set. Pass the texts; the answer names the styles and tokens it used. A starting point to refine with design_apply, not a finished design. Needs the project's Server API key.",
  });
  addOperationTool(server, context, framerRead, {
    name: "framer_read",
    title: "Query Framer's agent",
    description:
      "Runs Framer's own readProject queries (font-search, component-definition, icon-set-definition, shader-definition, implementation guides…) and returns their answer as is: for what the other tools do not read. framer_docs section \"essentials\" lists the query types. Needs the project's Server API key.",
  });
}
