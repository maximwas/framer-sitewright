/** The design guide's topics, in reading order, with what each holds (the files in apps/server/knowledge). */
export const GUIDE_TOPICS = {
  workflow: "the order of work for a new page or redesign, and the checks before calling it done",
  dsl: "what Framer does without saying so: batches, breakpoints, components and clicks, forms, overlays, CMS lists, which springs it keeps, metadata, assets",
  layout:
    "alignment, distribution, sizes by role, equal heights, grids, containers, spacing, breakpoints, buttons, images",
  typography: "families, scale, tracking, line height, balance, measure, labels, breakpoint sizes",
  direction: "what makes a site look designed, with numbers from top Framer sites, and the habits of generated pages",
  sections: "navigation, hero, features, proof, pricing, FAQ, closing call to action and footer",
  motion:
    "what motion to offer (subtle, balanced, expressive) and how to build each effect, pinned scroll sections, scroll headers, horizontal galleries, page transitions, tabs, links on components",
  verify: "the audit, looking at the result, and the checklist before handing a page over",
  template: "a site for the Framer Marketplace: Framer's template checklist, what buyers edit, and the listing",
  "no-key": "what works through the plugin without a Server API key, and how to get the rest anyway",
} as const;
