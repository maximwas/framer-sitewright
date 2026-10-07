import * as z from "zod";
import {
  INLINE_TYPE_ATTRIBUTES,
  NESTING_MAX,
  PAGE_LAYERS_MAX,
  SITE_AUDIT_FINDINGS_MAX,
} from "../../constants/site-checks.ts";
import { requireAgent } from "../../framer/runtime.ts";
import { serializedList } from "../../history/dsl/serialized.ts";
import { idOf, nameOf } from "../../plugin-nodes/node-record.ts";
import { pageLayers } from "../../plugin-nodes/walk.ts";
import { SiteFindingSchema } from "../../schemas/site-checks.ts";
import type { SiteFinding } from "../../types/site-checks.ts";
import { errorMessage } from "../../utils/errors.ts";
import { rollUp, topRules } from "../../utils/site-audit.ts";
import { countOf } from "../../utils/text.ts";
import { defineOperation } from "../define.ts";
import { layoutAudit } from "../nodes/audit.ts";
import { pagesToSearch } from "../nodes/find.ts";
import { a11yAudit, imagesCheck, linksCheck, seoAudit } from "./checks.ts";

const RollUpSchema = z.object({
  check: z.string(),
  defects: z.number().int(),
  likely: z.number().int(),
  taste: z.number().int(),
  worstPages: z.array(
    z.object({
      page: z.string(),
      count: z.number().int(),
    }),
  ),
});

const summaryOf = (findings: readonly SiteFinding[]) =>
  findings.length === 0
    ? "Nothing found."
    : `${countOf(findings.length, "finding")}, ${countOf(findings.filter(({ severity }) => severity === "defect").length, "defect")}.`;

export const siteAudit = defineOperation({
  name: "site.audit",
  effect: "read",
  idempotent: true,
  permissions: [],
  needsAgent: true,
  input: z.strictObject({
    layout: z.boolean().default(true).describe("Also run layout_audit on every page (slower on big sites)."),
  }),
  output: z.object({
    checks: z.array(RollUpSchema),
    rules: z.array(
      z.object({
        rule: z.string(),
        count: z.number().int(),
      }),
    ),
    /** The defects in full, the most urgent first; run each check alone for its likely and taste findings. */
    defects: z.array(SiteFindingSchema),
    failed: z.array(z.string()),
    summary: z.string(),
  }),
  async run(context, { layout }) {
    const all: { check: string; findings: SiteFinding[] }[] = [];
    const failed: string[] = [];
    const checks = [
      ["seo", () => seoAudit.run(context, {})],
      ["links", () => linksCheck.run(context, {})],
      ["images", () => imagesCheck.run(context, {})],
      ["a11y", () => a11yAudit.run(context, {})],
    ] as const;

    for (const [check, run] of checks) {
      try {
        all.push({
          check,
          findings: [...(await run()).findings],
        });
      } catch (error) {
        failed.push(`${check}: ${errorMessage(error)}`);
      }
    }

    if (layout) {
      const findings: SiteFinding[] = [];

      for (const page of await pagesToSearch(context.runtime.port, undefined)) {
        const pagePath = page.path ?? "/";

        try {
          const audit = await layoutAudit.run(context, { pagePath });

          findings.push(
            ...audit.issues.map((issue) => ({
              ...issue,
              page: pagePath,
            })),
          );
        } catch (error) {
          failed.push(`layout ${pagePath}: ${errorMessage(error)}`);
        }
      }

      all.push({
        check: "layout",
        findings,
      });
    }

    const everything = all.flatMap(({ findings }) => findings);

    return {
      checks: all.map(({ check, findings }) => rollUp(check, findings)),
      rules: topRules(everything),
      defects: everything.filter(({ severity }) => severity === "defect").slice(0, SITE_AUDIT_FINDINGS_MAX),
      failed,
      summary: summaryOf(everything),
    };
  },
  describe(_input, { summary }) {
    return {
      subject: "Whole site",
      summary,
    };
  },
});

export const performanceAudit = defineOperation({
  name: "site.performance",
  effect: "read",
  idempotent: true,
  permissions: [],
  input: z.strictObject({
    pagePath: z.string().startsWith("/").exactOptional().describe("One page; omit for every web page."),
  }),
  output: z.object({
    pages: z.array(
      z.object({
        page: z.string(),
        layers: z.number().int(),
        deepest: z.number().int(),
        images: z.number().int(),
      }),
    ),
    findings: z.array(SiteFindingSchema),
    summary: z.string(),
  }),
  async run({ runtime }, { pagePath }) {
    const pages: { page: string; layers: number; deepest: number; images: number }[] = [];
    const findings: SiteFinding[] = [];

    for (const page of await pagesToSearch(runtime.port, pagePath)) {
      const path = page.path ?? "/";
      const { layers } = await pageLayers(runtime.port, page.id);
      const deepest = Math.max(0, ...layers.map(({ depth }) => depth));
      const images = layers.filter(
        ({ node }) => node["backgroundImage"] !== undefined && node["backgroundImage"] !== null,
      ).length;

      pages.push({
        page: path,
        layers: layers.length,
        deepest,
        images,
      });

      if (layers.length > PAGE_LAYERS_MAX) {
        findings.push({
          rule: "heavy-page",
          severity: "likely",
          page: path,
          nodeId: null,
          nodeName: null,
          message: `${layers.length} layers on the main breakpoint (over ${PAGE_LAYERS_MAX}): a slow page to load and to edit.`,
          fix: "Move repeated blocks into components or CMS lists, and drop wrapper frames that only hold one child.",
        });
      }

      for (const { node, depth } of layers.filter((layer) => layer.depth > NESTING_MAX).slice(0, 5)) {
        findings.push({
          rule: "deep-nesting",
          severity: "likely",
          page: path,
          nodeId: idOf(node),
          nodeName: nameOf(node),
          message: `Nested ${depth} levels deep (over ${NESTING_MAX}).`,
          fix: "Flatten the frames around it: a stack's own padding and gap replace most wrappers.",
        });
      }
    }

    return {
      pages,
      findings,
      summary: summaryOf(findings),
    };
  },
  describe(_input, { summary }) {
    return { summary };
  },
});

export const richTextAudit = defineOperation({
  name: "site.richText",
  effect: "read",
  idempotent: true,
  permissions: [],
  needsAgent: true,
  input: z.strictObject({
    pagePath: z.string().startsWith("/").exactOptional().describe("One page; omit for every web page."),
  }),
  output: z.object({
    findings: z.array(SiteFindingSchema),
    summary: z.string(),
  }),
  async run({ runtime }, { pagePath }) {
    const agent = requireAgent(runtime);
    const findings: SiteFinding[] = [];

    for (const page of await pagesToSearch(runtime.port, pagePath)) {
      const path = page.path ?? "/";
      const texts = serializedList(
        await agent.getDescendantsOfTypes(
          {
            id: page.id,
            types: ["RichTextNode", "TextBlock", "TextRun"],
          },
          { pagePath: path },
        ),
      );

      for (const node of texts) {
        // serialize() keeps the values under attributes.
        const record = node.attributes ?? {};
        const inline = INLINE_TYPE_ATTRIBUTES.filter((name) => record[name] !== undefined && record[name] !== null);
        const color = record["textColor"];

        if (inline.length > 0) {
          findings.push({
            rule: "inline-type",
            severity: "likely",
            page: path,
            nodeId: node.id,
            nodeName: node.name ?? null,
            message: `Type set inline (${inline.join(", ")}) instead of through a text style.`,
            fix: "Give the text a text style that has these values, then clear them on the text (design_apply, null).",
          });
        }

        if (typeof color === "string" && !color.startsWith("var(--")) {
          findings.push({
            rule: "raw-text-color",
            severity: "likely",
            page: path,
            nodeId: node.id,
            nodeName: node.name ?? null,
            message: `Text colored ${color} directly, not with a token.`,
            fix: 'Use the matching color token, textColor="var(--token-<id>)", so a palette change reaches it.',
          });
        }
      }
    }

    return {
      findings,
      summary: summaryOf(findings),
    };
  },
  describe(_input, { summary }) {
    return { summary };
  },
});
