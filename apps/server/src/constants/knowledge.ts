/** The Framer guide's topics, in reading order, with what each holds (the files in apps/server/knowledge). */
export const GUIDE_TOPICS = {
  dsl: "what Framer does without saying so: batches, breakpoints, text styles, components and clicks, menus, forms, overlays, CMS lists, which springs it keeps, metadata, assets, Marketplace components",
  layout:
    "how stacks, sizes, equal heights, grids, containers, breakpoints, sticky and overflow, images and links behave in Framer",
  motion:
    "listing the states of anything that moves or responds, which transitions Framer keeps, how to build effects, pinned scroll sections, scroll headers, horizontal galleries, page transitions, tabs, links on components",
  verify:
    "the audit, looking at the result, going through every state in a real browser, the checks that it works, and what to tell the user at handover",
  template: "a site for the Framer Marketplace: Framer's template checklist, what buyers edit, and the listing",
  "no-key": "what works through the plugin without a Server API key, and how to get the rest anyway",
} as const;
