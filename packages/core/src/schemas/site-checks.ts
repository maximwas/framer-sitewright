import * as z from "zod";
import { AUDIT_SEVERITIES } from "../constants/layout-audit.ts";
import { LINK_KINDS } from "../constants/site-checks.ts";

/** One thing a site check found, on which page and layer, and how to fix it. */
export const SiteFindingSchema = z.object({
  rule: z.string(),
  severity: z.enum(AUDIT_SEVERITIES),
  page: z.string(),
  nodeId: z.string().nullable(),
  nodeName: z.string().nullable(),
  message: z.string(),
  fix: z.string(),
});

export const SiteLinkSchema = z.object({
  page: z.string(),
  nodeId: z.string(),
  nodeName: z.string().nullable(),
  href: z.string(),
  kind: z.enum(LINK_KINDS),
});

export const SiteImageSchema = z.object({
  page: z.string(),
  nodeId: z.string(),
  nodeName: z.string().nullable(),
  url: z.string(),
  /** A fill of the layer, or an image control of a component instance (whose alt text the component holds). */
  source: z.enum(["fill", "control"]),
  alt: z.string().nullable(),
});

export const ContrastSchema = z.object({
  ratio: z.number(),
  aa: z.boolean(),
  aaLarge: z.boolean(),
  aaa: z.boolean(),
});

export const SiteChecksInputSchema = z.strictObject({
  pagePath: z.string().startsWith("/").exactOptional().describe("One page; omit for every web page."),
});
