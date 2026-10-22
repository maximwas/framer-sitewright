import { CapabilitiesSchema } from "@sitewright/core";
import * as z from "zod";
import { RouterStatusSchema } from "./transports.ts";

export const RevertOptionsShape = {
  onConflict: z
    .enum(["skip", "force"])
    .default("skip")
    .describe("skip keeps items someone changed after the AI; force overwrites them."),
};

export const DocsInputSchema = z.strictObject({
  section: z
    .string()
    .trim()
    .min(1)
    .exactOptional()
    .describe('"essentials" for the core of the reference in one read, or a section id or title, e.g. "Variables".'),
  query: z.string().trim().min(2).exactOptional().describe("Full-text search across the reference."),
  guide: z
    .string()
    .trim()
    .min(1)
    .exactOptional()
    .describe(
      'One of Framer\'s implementation guides by name, e.g. "FAQ", "Navigations", "Buttons", "Effects", "Overlays", "Forms": its recipe with example nodes.',
    ),
  offset: z.number().int().min(0).default(0).describe("Continue a long section from nextOffset."),
  limit: z.number().int().min(1000).max(40000).default(20000).describe("Maximum characters of content to return."),
});

export const DocsOutputSchema = z.object({
  mode: z.enum(["index", "section", "search", "guide"]),
  sections: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      level: z.number().int(),
      snippet: z.string().nullable(),
    }),
  ),
  content: z.string().nullable(),
  nextOffset: z.number().int().nullable(),
});

export const ScreenshotInputSchema = z.strictObject({
  nodeId: z.string().min(1).describe("Node id from nodes_read or design_apply renamedIds."),
  scale: z.literal([0.5, 1, 2]).default(1).describe("Pixel density."),
  clip: z
    .strictObject({
      x: z.number(),
      y: z.number(),
      width: z.number().positive(),
      height: z.number().positive(),
    })
    .exactOptional()
    .describe("Region of the node to capture, in CSS pixels before scale."),
});

/** image_compare: a node captured like node_screenshot, and the reference image it should match. */
export const ImageCompareInputSchema = ScreenshotInputSchema.extend({
  reference: z
    .string()
    .min(1)
    .describe(
      "The reference image, a PNG or JPEG: a path on this computer (absolute, or relative to the project folder; a Figma export) or an https URL.",
    ),
  referenceClip: z
    .strictObject({
      x: z.number().min(0),
      y: z.number().min(0),
      width: z.number().positive(),
      height: z.number().positive(),
    })
    .exactOptional()
    .describe(
      "The part of the reference that matches the node, in the reference's px: e.g. one container of the design.",
    ),
  referenceFit: z
    .enum(["none", "width"])
    .default("none")
    .describe(
      "width scales the reference (after referenceClip) to the capture's width: a 1440 design against a 1200 breakpoint.",
    ),
});

/** framer_status and framer_connect: both transports, and what the project's plan allows as far as known. */
export const StatusOutputSchema = RouterStatusSchema.extend({
  capabilities: CapabilitiesSchema.nullable().describe(
    "What the project's Framer plan allows, as far as known; null before a project is connected.",
  ),
  server: z
    .object({
      version: z.string(),
      source: z.enum(["npm", "local build"]),
      path: z.string().nullable(),
    })
    .describe("This Sitewright: its version, and whether it runs from npm or a local build (and where)."),
});

/** readProject's answer to guide queries: each result has the guide's text, or says why not. */
export const GuideResultsSchema = z.object({
  results: z.array(
    z.looseObject({
      name: z.string().optional(),
      guide: z.string().optional(),
    }),
  ),
});
