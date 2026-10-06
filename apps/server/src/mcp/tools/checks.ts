import type { McpServer } from "@modelcontextprotocol/server";
import { a11yAudit, contrastCheck, imagesCheck, linksCheck, seoAudit } from "@sitewright/core";
import type { ToolContext } from "../../types/mcp.ts";
import { addOperationTool } from "../add-tool.ts";

export function registerCheckTools(server: McpServer, context: ToolContext): void {
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
      "Lists every photo on the site (image fills and image controls of component instances) and finds the same photo used on more than one layer, by its file, even at different sizes, so two cards never show the same people, and photo fills without alt text (with a Server API key, which reads altText). Use it after placing stock photos.",
  });
  addOperationTool(server, context, a11yAudit, {
    name: "a11y_audit",
    title: "Check accessibility",
    description:
      "Finds text that does not stand out from the solid color behind it (WCAG AA: 4.5:1, 3:1 for text of 24px and more), with tokens and text style colors resolved; links with no text inside for a screen reader; and photos without alt text. Text over photos and gradients is left out: no single color is behind it. Fix every low-contrast defect: change the text token, not the brand color.",
  });
  addOperationTool(server, context, contrastCheck, {
    name: "contrast_check",
    title: "Check a color pair",
    description:
      'Gives the WCAG contrast of a text color on a background — CSS colors or the project\'s tokens by path ("Text/Primary") — with AA, AA-large and AAA verdicts. Check every text/background pair of a palette before proposing it (white on a mid orange usually fails).',
  });
}
