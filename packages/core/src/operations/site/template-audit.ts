import * as z from "zod";
import { TEMPLATE_MANUAL_CHECKS, TEMPLATE_SECTION_CHECKS, TEMPLATE_SECTIONS } from "../../constants/template-audit.ts";
import { auditContext } from "../../layout-audit/audit.ts";
import { TemplateSectionSchema } from "../../schemas/template-audit.ts";
import { imageFindings, imagesOf } from "../../site-checks/images.ts";
import { linkFindings, linksOf } from "../../site-checks/links.ts";
import { seoFindings } from "../../site-checks/seo.ts";
import {
  cmsTextFindings,
  collectionFindings,
  handCopiedFindings,
  layerNameFindings,
  logoFindings,
  placeholderFindings,
} from "../../site-checks/template-content.ts";
import {
  breakpointFindings,
  pageSetFindings,
  projectStyleFindings,
  styleFindings,
} from "../../site-checks/template-site.ts";
import { bySeverity, foldFindings } from "../../site-checks/values.ts";
import type { SiteFinding } from "../../types/site-checks.ts";
import type { TemplateSectionId } from "../../types/template-audit.ts";
import { countOf } from "../../utils/text.ts";
import { defineOperation } from "../define.ts";
import { readCollections, readSiteMetadata, readSitePages, siteCheckContext } from "./read-site.ts";

/** What the audit cannot see without the Server API. */
const NO_KEY_NOTE =
  "Read through the Plugin API (no Server API key): layout templates, page metadata, alt text, anchors and form tags are not visible, so those checks were skipped. Add the project's key for the full audit.";

export const templateAudit = defineOperation({
  name: "site.template",
  effect: "read",
  idempotent: true,
  permissions: [],
  input: z.strictObject({}),
  output: z.object({
    sections: z.array(TemplateSectionSchema),
    /** What the creator checks by hand: the audit cannot see it. */
    manual: z.array(z.string()),
    summary: z.string(),
    note: z.string().nullable(),
  }),
  async run({ runtime }) {
    const [{ pages, rootId }, context, audit, collections] = await Promise.all([
      readSitePages(runtime),
      siteCheckContext(runtime),
      auditContext(runtime.port),
      readCollections(runtime.port),
    ]);
    const site = await readSiteMetadata(runtime, rootId);
    const complete = runtime.agent !== null;
    const year = new Date().getFullYear();
    const found: Record<TemplateSectionId, SiteFinding[]> = {
      cms: [...pages.flatMap(handCopiedFindings), ...collectionFindings(collections)],
      pages: pageSetFindings(pages, collections, complete),
      responsive: pages.flatMap((page) => breakpointFindings(page, audit)),
      layers: pages.flatMap(layerNameFindings),
      text: [...pages.flatMap((page) => placeholderFindings(page, year)), ...cmsTextFindings(collections)],
      seo: [
        ...seoFindings(pages, site, context),
        ...foldFindings(
          pages
            .flatMap((page) => imageFindings(imagesOf(page), page.complete))
            .filter(({ rule }) => rule === "missing-alt"),
        ),
      ],
      styles: [...projectStyleFindings(audit), ...pages.flatMap((page) => styleFindings(page, audit))],
      links: linkFindings(pages, pages.flatMap(linksOf)),
      copyright: pages.flatMap(logoFindings),
    };
    const sections = TEMPLATE_SECTIONS.map((section) => ({
      section,
      checks: TEMPLATE_SECTION_CHECKS[section],
      findings: bySeverity(found[section]),
    }));
    const all = sections.flatMap(({ findings }) => findings);
    const failing = sections.filter(({ findings }) => findings.length > 0).length;

    return {
      sections,
      manual: [...TEMPLATE_MANUAL_CHECKS],
      summary:
        all.length === 0
          ? `Nothing found in ${countOf(sections.length, "section")}.`
          : `${countOf(all.length, "finding")}, ${countOf(all.filter(({ severity }) => severity === "defect").length, "defect")}, in ${failing} of ${countOf(sections.length, "section")}.`,
      note: complete ? null : NO_KEY_NOTE,
    };
  },
  describe(_input, { summary }) {
    return {
      subject: "Template",
      summary,
    };
  },
});
