/** The design guide's topics, in reading order, with what each holds (the files in apps/server/knowledge). */
export const GUIDE_TOPICS = {
  dsl: "what Framer does without saying so: batches, breakpoints, text styles, components and clicks, menus, forms, overlays, CMS lists, which springs it keeps, metadata, assets, Marketplace components",
  layout:
    "alignment, distribution, sizes by role, equal heights, grids, containers, spacing, breakpoints, buttons, images",
  motion:
    "the states list anything that moves or responds needs before it is built, what motion to offer (subtle, balanced, expressive) and how to build each effect, pinned scroll sections, scroll headers, horizontal galleries, page transitions, tabs, links on components",
  verify:
    "the audit, looking at the result, going through every state in a real browser, the checklist, and what to tell the user at handover",
  template: "a site for the Framer Marketplace: Framer's template checklist, what buyers edit, and the listing",
  "no-key": "what works through the plugin without a Server API key, and how to get the rest anyway",
} as const;
