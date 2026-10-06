import * as z from "zod";
import { OperationError } from "../../errors.ts";
import {
  ContrastSchema,
  SiteChecksInputSchema,
  SiteFindingSchema,
  SiteImageSchema,
  SiteLinkSchema,
} from "../../schemas/site-checks.ts";
import { a11yFindings } from "../../site-checks/a11y.ts";
import { imageFindings, imagesOf } from "../../site-checks/images.ts";
import { linkFindings, linksOf } from "../../site-checks/links.ts";
import { seoFindings } from "../../site-checks/seo.ts";
import { contrastOf, solidColor } from "../../site-checks/values.ts";
import type { SiteFinding } from "../../types/site-checks.ts";
import { countOf } from "../../utils/text.ts";
import { defineOperation } from "../define.ts";
import { readSiteMetadata, readSitePages, siteCheckContext } from "./read-site.ts";

/** Most links and photos a check lists; its findings are never cut. */
const LIST_MAX = 200;

/** What a check without the Server API cannot see. */
const NO_KEY_NOTE =
  "Read through the Plugin API (no Server API key): alt text, anchors and page metadata are not visible, so those checks were skipped.";

const findingsSummary = (findings: readonly SiteFinding[]) =>
  findings.length === 0
    ? "Nothing found."
    : `${countOf(findings.length, "finding")}, ${countOf(findings.filter((found) => found.severity === "defect").length, "defect")}.`;

export const linksCheck = defineOperation({
  name: "site.links",
  effect: "read",
  idempotent: true,
  permissions: [],
  // With a key the checks read through the Server API: the plugin's read lacks the colors, tokens and text
  // blocks they judge by (a11y_audit flagged light text on dark sections at 1.08:1 through it).
  needsAgent: true,
  input: SiteChecksInputSchema,
  output: z.object({
    links: z.array(SiteLinkSchema),
    findings: z.array(SiteFindingSchema),
    summary: z.string(),
    note: z.string().nullable(),
  }),
  async run({ runtime }, { pagePath }) {
    const { pages } = await readSitePages(runtime);
    const checked = pagePath === undefined ? pages : pages.filter((page) => page.path === pagePath);

    if (checked.length === 0) {
      throw new OperationError(
        "NOT_FOUND",
        `No web page with path "${pagePath}".`,
        "Call project_overview to list pages.",
      );
    }

    const links = checked.flatMap(linksOf);
    const findings = linkFindings(pages, links);

    return {
      links: links.slice(0, LIST_MAX),
      findings,
      summary: `${countOf(links.length, "link")}; ${findingsSummary(findings)}`,
      note: runtime.agent === null ? NO_KEY_NOTE : null,
    };
  },
  describe(_input, { links, findings }) {
    return {
      subject: countOf(links.length, "link"),
      summary: findingsSummary(findings),
    };
  },
});

export const seoAudit = defineOperation({
  name: "site.seo",
  effect: "read",
  idempotent: true,
  permissions: [],
  needsAgent: true,
  input: SiteChecksInputSchema,
  output: z.object({
    findings: z.array(SiteFindingSchema),
    summary: z.string(),
    note: z.string().nullable(),
  }),
  async run({ runtime }, { pagePath }) {
    const [{ pages, rootId }, context] = await Promise.all([
      readSitePages(runtime, pagePath),
      siteCheckContext(runtime),
    ]);
    const site = await readSiteMetadata(runtime, rootId);
    const findings = [
      ...seoFindings(pages, site, context),
      ...pages
        .flatMap((page) => imageFindings(imagesOf(page), page.complete))
        .filter(({ rule }) => rule === "missing-alt"),
    ];

    return {
      findings,
      summary: findingsSummary(findings),
      note: runtime.agent === null ? NO_KEY_NOTE : null,
    };
  },
  describe(_input, { findings }) {
    return {
      subject: "SEO",
      summary: findingsSummary(findings),
    };
  },
});

export const imagesCheck = defineOperation({
  name: "site.images",
  effect: "read",
  idempotent: true,
  permissions: [],
  needsAgent: true,
  input: SiteChecksInputSchema,
  output: z.object({
    images: z.array(SiteImageSchema),
    findings: z.array(SiteFindingSchema),
    summary: z.string(),
    note: z.string().nullable(),
  }),
  async run({ runtime }, { pagePath }) {
    const { pages } = await readSitePages(runtime, pagePath);
    const images = pages.flatMap(imagesOf);
    const findings = imageFindings(images, runtime.agent !== null);

    return {
      images: images.slice(0, LIST_MAX),
      findings,
      summary: `${countOf(images.length, "image")}; ${findingsSummary(findings)}`,
      note: runtime.agent === null ? NO_KEY_NOTE : null,
    };
  },
  describe(_input, { images, findings }) {
    return {
      subject: countOf(images.length, "image"),
      summary: findingsSummary(findings),
    };
  },
});

export const a11yAudit = defineOperation({
  name: "site.a11y",
  effect: "read",
  idempotent: true,
  permissions: [],
  needsAgent: true,
  input: SiteChecksInputSchema,
  output: z.object({
    findings: z.array(SiteFindingSchema),
    summary: z.string(),
  }),
  async run({ runtime }, { pagePath }) {
    const [{ pages }, context] = await Promise.all([readSitePages(runtime, pagePath), siteCheckContext(runtime)]);
    const findings = [
      ...pages.flatMap((page) => a11yFindings(page, context)),
      ...pages
        .flatMap((page) => imageFindings(imagesOf(page), page.complete))
        .filter(({ rule }) => rule === "missing-alt"),
    ];

    return {
      findings,
      summary: findingsSummary(findings),
    };
  },
  describe(_input, { findings }) {
    return {
      subject: "Accessibility",
      summary: findingsSummary(findings),
    };
  },
});

export const contrastCheck = defineOperation({
  name: "colors.contrast",
  effect: "read",
  idempotent: true,
  permissions: [],
  input: z.strictObject({
    foreground: z
      .string()
      .min(1)
      .describe('Text color: a CSS color ("#ffffff") or a token by path or id ("Text/Primary").'),
    background: z.string().min(1).describe("Background color, the same way."),
  }),
  output: ContrastSchema.extend({
    foreground: z.string(),
    background: z.string(),
    verdict: z.string(),
  }),
  async run({ runtime }, { foreground, background }) {
    const colors = await runtime.port.getColorStyles();
    const context = {
      token: (id: string) => colors.find((color) => color.id === id)?.light ?? null,
      textStyle: () => null,
    };
    const resolve = (value: string) => {
      const token = colors.find(
        (color) => color.path === value || color.path === `/${value}` || color.name === value || color.id === value,
      );

      return token?.light ?? solidColor(value, context);
    };
    const [fg, bg] = [resolve(foreground), resolve(background)];
    const contrast = fg === null || bg === null ? null : contrastOf(fg, bg);

    if (fg === null || bg === null || contrast === null) {
      throw new OperationError(
        "INVALID_COLOR",
        `Cannot compare "${foreground}" with "${background}".`,
        "Pass solid colors (hex, rgb) or token paths; images and gradients have no single color.",
      );
    }

    return {
      ...contrast,
      foreground: fg,
      background: bg,
      verdict: contrast.aaa
        ? "AAA: fine for any text."
        : contrast.aa
          ? "AA: fine for body text."
          : contrast.aaLarge
            ? "AA for large text only (24px+, or 19px bold)."
            : "Fails: too low for any text.",
    };
  },
  describe({ foreground, background }, { ratio }) {
    return {
      subject: `${foreground} on ${background}`,
      summary: `${ratio}:1`,
    };
  },
});
