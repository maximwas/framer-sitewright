import * as z from "zod";
import { CODE_TEMPLATES, type CodeTemplateName } from "../../constants/code-templates.ts";
import { TYPE_SCALE_RATIOS } from "../../constants/type-scale.ts";
import { requireAgent } from "../../framer/runtime.ts";
import { sectionXml } from "../../utils/section-xml.ts";
import { countOf } from "../../utils/text.ts";
import { typeScale } from "../../utils/type-scale.ts";
import { codeFileWrite } from "../code/code-files.ts";
import { defineOperation } from "../define.ts";
import { textStylesUpsert } from "../text-styles/upsert.ts";
import { designApply } from "./apply.ts";

const FONT_WEIGHT = z.union([
  z.literal(100),
  z.literal(200),
  z.literal(300),
  z.literal(400),
  z.literal(500),
  z.literal(600),
  z.literal(700),
  z.literal(800),
  z.literal(900),
]);

export const typeScaleGenerate = defineOperation({
  name: "textStyles.scale",
  effect: "write",
  idempotent: true,
  permissions: ["createTextStyle", "TextStyle.setAttributes"],
  input: z.strictObject({
    base: z.number().min(12).max(24).default(16).describe("The body size in px."),
    ratio: z
      .union([z.enum(Object.keys(TYPE_SCALE_RATIOS) as [keyof typeof TYPE_SCALE_RATIOS]), z.number().min(1.05).max(2)])
      .default("majorThird")
      .describe(
        "How fast sizes grow: a name (minorThird 1.2, majorThird 1.25, perfectFourth 1.333, perfectFifth 1.5, goldenRatio 1.618) or a number.",
      ),
    headingFont: z.string().min(1).describe("The headings' family, exactly as Framer's library names it."),
    bodyFont: z.string().min(1).exactOptional().describe("The body's family; omit to use the heading one."),
    headingWeight: FONT_WEIGHT.default(600),
    bodyWeight: FONT_WEIGHT.default(400),
    apply: z.boolean().default(false).describe("Write the styles (text_styles_upsert); false only proposes them."),
  }),
  output: z.object({
    ratio: z.number(),
    styles: z.array(
      z.object({
        path: z.string(),
        tag: z.string(),
        fontSize: z.string(),
        lineHeight: z.string(),
        letterSpacing: z.string(),
        family: z.string(),
        weight: z.number(),
      }),
    ),
    applied: z.boolean(),
  }),
  async run(context, { base, ratio, headingFont, bodyFont, headingWeight, bodyWeight, apply }) {
    const factor = typeof ratio === "number" ? ratio : TYPE_SCALE_RATIOS[ratio];
    const styles = typeScale(base, factor).map(({ path, tag, fontSize, lineHeight, letterSpacing, heading }) => ({
      path,
      tag,
      fontSize,
      lineHeight,
      letterSpacing,
      family: heading ? headingFont : (bodyFont ?? headingFont),
      weight: heading ? headingWeight : bodyWeight,
    }));

    if (apply) {
      await textStylesUpsert.run(context, {
        styles: styles.map(({ path, tag, fontSize, lineHeight, letterSpacing, family, weight }) => ({
          path,
          tag,
          fontSize,
          lineHeight,
          letterSpacing,
          font: {
            family,
            weight,
          },
          ...(tag.startsWith("h") ? { balance: true } : {}),
        })),
        dryRun: false,
        via: "auto",
      });
    }

    return {
      ratio: factor,
      styles,
      applied: apply,
    };
  },
  describe(_input, { styles, applied }) {
    return { summary: `${countOf(styles.length, "style")}${applied ? "" : " (proposed)"}` };
  },
});

export const framerRead = defineOperation({
  name: "project.readProject",
  effect: "read",
  idempotent: true,
  permissions: [],
  needsAgent: true,
  input: z.strictObject({
    queries: z
      .array(z.looseObject({ type: z.string().min(1) }))
      .min(1)
      .max(10)
      .describe(
        'readProject queries as framer_docs section "essentials" lists them, e.g. { type: "font-search", query: "Inter" }.',
      ),
    pagePath: z.string().startsWith("/").exactOptional(),
  }),
  output: z.object({ result: z.unknown() }),
  async run({ runtime }, { queries, pagePath }) {
    return {
      result: await requireAgent(runtime).readProject(queries, pagePath === undefined ? undefined : { pagePath }),
    };
  },
  describe({ queries }) {
    return { subject: queries.map(({ type }) => type).join(", ") };
  },
});

const SECTION_KINDS = ["hero", "cta", "features"] as const;

/** The first token whose path has one of the words, in this order of preference. */
function tokenFor(tokens: readonly { id: string; path: string }[], ...words: string[]): string | undefined {
  for (const word of words) {
    const found = tokens.find(({ path }) => path.toLowerCase().includes(word));

    if (found !== undefined) {
      return found.id;
    }
  }

  return undefined;
}

export const sectionBuild = defineOperation({
  name: "sections.build",
  effect: "write",
  idempotent: false,
  permissions: [],
  needsAgent: true,
  input: z.strictObject({
    kind: z.enum(SECTION_KINDS),
    parentId: z.string().min(1).describe("Where the section goes: the page's Main frame or its breakpoint."),
    pagePath: z.string().startsWith("/").default("/"),
    index: z.number().int().min(0).exactOptional().describe("Its place among the parent's children; omit for last."),
    heading: z.string().min(1),
    text: z.string().min(1).exactOptional(),
    button: z
      .strictObject({
        label: z.string().min(1),
        link: z.string().min(1),
      })
      .exactOptional(),
    items: z
      .array(
        z.strictObject({
          title: z.string().min(1),
          text: z.string().min(1),
        }),
      )
      .min(1)
      .max(12)
      .exactOptional()
      .describe("features: the cards."),
    maxWidth: z
      .string()
      .regex(/^\d+px$/)
      .default("1200px")
      .describe("The site's content width."),
  }),
  output: z.object({
    ok: z.boolean(),
    message: z.string(),
    sectionId: z.string().nullable(),
    used: z.record(z.string(), z.string().nullable()),
  }),
  async run(context, { pagePath, maxWidth, ...spec }) {
    const [tokens, styles] = await Promise.all([
      context.runtime.port.getColorStyles(),
      context.runtime.port.getTextStyles(),
    ]);
    const byTag = (tags: string[]) => styles.find(({ tag }) => tags.includes(tag))?.path.replace(/^\//, "");
    const look = {
      heading: byTag(spec.kind === "hero" ? ["h1", "h2"] : ["h2", "h3"]),
      body: byTag(["p"]),
      ink: tokenFor(tokens, "text/primary", "ink", "text"),
      muted: tokenFor(tokens, "muted", "secondary"),
      surface: tokenFor(tokens, "surface/card", "card", "surface"),
      accent: tokenFor(tokens, "accent", "brand", "primary"),
      onAccent: tokenFor(tokens, "on accent", "on signal", "inverse"),
      maxWidth,
    };
    const result = await designApply.run(context, {
      xml: sectionXml(spec, look),
      pagePath,
    });

    return {
      ok: result.ok,
      message: result.message,
      sectionId: result.keys?.["section"] ?? null,
      used: Object.fromEntries(Object.entries(look).map(([role, value]) => [role, value ?? null])),
    };
  },
  refused(output) {
    return output.ok ? null : output.message;
  },
  describe({ kind, heading }) {
    return {
      subject: kind,
      summary: heading,
    };
  },
});

export const codeTemplateInsert = defineOperation({
  name: "codeFiles.template",
  effect: "write",
  idempotent: true,
  permissions: ["createCodeFile", "CodeFile.setFileContent"],
  input: z.strictObject({
    template: z.enum(Object.keys(CODE_TEMPLATES) as [CodeTemplateName, ...CodeTemplateName[]]),
    fileName: z.string().min(1).exactOptional().describe("Another file name, e.g. FaqAccordion.tsx."),
  }),
  output: z.object({
    file: z.string(),
    id: z.string(),
    about: z.string(),
  }),
  async run(context, { template, fileName }) {
    const chosen = CODE_TEMPLATES[template];
    const file = await codeFileWrite.run(context, {
      name: fileName ?? chosen.file,
      code: chosen.code,
    });

    return {
      file: file.name,
      id: file.id,
      about: chosen.about,
    };
  },
  describe({ template }, { file }) {
    return {
      subject: file,
      summary: template,
    };
  },
});
