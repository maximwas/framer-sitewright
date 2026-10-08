import type { McpServer } from "@modelcontextprotocol/server";
import {
  a11yAudit,
  contrastCheck,
  imagesCheck,
  linksCheck,
  performanceAudit,
  richTextAudit,
  seoAudit,
  siteAudit,
  templateAudit,
} from "@sitewright/core";
import { liveCheck, publishedSite } from "../../live-check/check.ts";
import { LiveCheckInputSchema, LiveCheckOutputSchema } from "../../schemas/live-check.ts";
import type { ToolContext } from "../../types/mcp.ts";
import { addOperationTool, addTool } from "../add-tool.ts";

export function registerCheckTools(server: McpServer, context: ToolContext): void {
  const { transports, journal } = context;

  addTool(server, {
    name: "live_check",
    title: "Check the published site",
    description:
      "Reads the published site as visitors get it (the pages of its sitemap up to limit, each image and internal link once) and finds what the editor cannot show: values published as references, a literal var(--…) or {{…}} in text, alt text, titles or meta tags (a CMS field bound to alt text does this); images and internal links that answer 4xx/5xx; anchors without a target; a missing title, description, social image or canonical URL; other than one h1 at a screen width; heavy pages; http resources on an https page. Without url it checks the connected project's production site (staging when there is none) and says how many pages changed in the editor since that publish. Run it after a publish, before calling the work done. It only reads public URLs and never publishes.",
    input: LiveCheckInputSchema,
    output: LiveCheckOutputSchema,
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: true,
    },
    run: (input) =>
      journal.read(
        "live_check",
        "Live check",
        "plugin-api",
        (result) => ({
          subject: result?.site ?? input.url ?? "Published site",
          summary: result?.summary ?? null,
        }),
        () =>
          liveCheck(input, {
            fetch: (url, init) => fetch(url, init),
            site: () => publishedSite(transports),
          }),
      ),
  });
  addOperationTool(server, context, seoAudit, {
    name: "seo_audit",
    title: "Check SEO",
    description:
      "Checks what search engines and link previews get, page by page: a title of 30–60 characters and a description of 70–160 on every page (a page inherits the site's), no title used twice, exactly one h1, no page hidden from search but the 404, alt text on photos, and a social image and favicon for the site. Run it before handing a site over or listing a template. With a Server API key it reads every page's metadata; without one it checks the headings only and says so in note.",
  });
  addOperationTool(server, context, linksCheck, {
    name: "links_check",
    title: "Check links",
    description:
      "Lists every link on the site (frames and the link controls of component instances) and finds the ones that lead nowhere: a path the site has no page for, an anchor (/#pricing) that no layer on the target page carries as elementId, a mailto without an address, a tel without a number. CMS detail paths (/blog/:slug) and variable links are left out. Anchors are checked only with a Server API key, which reads elementId.",
  });
  addOperationTool(server, context, imagesCheck, {
    name: "images_check",
    title: "Check photos",
    description:
      "Lists every photo on the site (image fills and image controls of component instances) and finds the same photo used on more than one layer, by its file, even at different sizes, so two cards never show the same people, and photo fills without alt text (with a Server API key, which reads altText). Use it after placing photos.",
  });
  addOperationTool(server, context, a11yAudit, {
    name: "a11y_audit",
    title: "Check accessibility",
    description:
      "Finds text that does not stand out from the solid color behind it (WCAG AA: 4.5:1, 3:1 for text of 24px and more), with tokens and text style colors resolved; links with no text inside for a screen reader; and photos without alt text. Text over photos and gradients is left out: no single color is behind it. Fix every low-contrast defect: change the text token, not the brand color.",
  });
  addOperationTool(server, context, templateAudit, {
    name: "template_audit",
    title: "Audit a Marketplace template",
    description:
      "Audits a Marketplace template against Framer's template checklist, section by section, each finding with a severity and a fix: cms (posts, cases, team and testimonials in CMS collections rather than copied by hand; no empty collections, -copy slugs or default collection names), pages (a custom 404, every page on a layout template, legal pages when there is a form), responsive (Desktop, Tablet and Phone breakpoints, each adapted), layers (no \"Frame 12\"), text (no lorem ipsum or past copyright year, in pages and CMS), seo (titles, descriptions, favicon, social image, one h1, alt text), styles (text styles and color tokens, not written-out values), links, and copyright (no real companies' logos). manual lists what to check by hand. Run it before listing a template and fix every defect. Without a Server API key it skips layout templates, metadata, alt text, anchors and forms, and says so in note.",
  });
  addOperationTool(server, context, contrastCheck, {
    name: "contrast_check",
    title: "Check a color pair",
    description:
      'Gives the WCAG contrast of a text color on a background — CSS colors or the project\'s tokens by path ("Text/Primary") — with AA, AA-large and AAA verdicts. Check every text/background pair of a palette before proposing it (white on a mid orange usually fails).',
  });
  addOperationTool(server, context, siteAudit, {
    name: "site_audit",
    title: "Audit the whole site",
    description:
      "Runs seo_audit, links_check, images_check, a11y_audit and (unless layout is false) layout_audit on every page in one call, and rolls them up: per check the defects, likely and taste findings and the three pages with the most, the rules hit most often, and every defect in full. The overview before handover; run a check on its own for its likely and taste findings. Needs the project's Server API key.",
  });
  addOperationTool(server, context, performanceAudit, {
    name: "performance_audit",
    title: "Audit page weight",
    description:
      "Measures each page's weight in the editor: layers on the main breakpoint, the deepest nesting and the photos; flags pages over 1,500 layers and layers nested more than 15 deep, with how to flatten them. For what visitors download (page size, broken images), use live_check on the published site.",
  });
  addOperationTool(server, context, richTextAudit, {
    name: "rich_text_audit",
    title: "Audit inline text formatting",
    description:
      "Finds text formatted outside the design system, down to the runs inside a rich text: type set inline (font, size, weight, tracking, line height) instead of through a text style, and text colored with a raw value instead of a token. Each finding names the layer and the fix. Needs the project's Server API key.",
  });
}
