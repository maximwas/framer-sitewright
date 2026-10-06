---
name: sitewright
description: >
  Use when building, restyling, fixing or reviewing a Framer site through the Sitewright MCP server (design_apply,
  nodes_read, project_brief, color_tokens_*, text_styles_*, layout_audit): a new site or redesign, one section, CMS,
  motion or breakpoints, or a page that looks generated, misaligned, uneven or broken on phones.
---

# Building Framer sites with Sitewright

The guide is served by the MCP server, so it matches the installed version: read a topic with `design_guide`. Start
with `workflow`; its step 0 tells a new site, help with one part and a fix apart, and a new site or a redesign begins
with `project_brief`.

| When | Topic |
| --- | --- |
| Before any new page, section set or redesign | `workflow` |
| Before the first `design_apply` of a session | `dsl` |
| Placing anything: stacks, grids, containers, spacing, breakpoints, buttons, images | `layout` |
| Text styles, sizes, tracking, headings | `typography` |
| Choosing the look, avoiding the generated look | `direction` |
| Hero, navigation, features, proof, pricing, FAQ, footer | `sections` |
| Anything that moves or responds: menus, sliders, tabs, accordions, scroll scenes, page transitions | `motion` |
| Before saying a page is done | `verify` |
| A template for the Framer Marketplace | `template` |
| No Server API key (plugin only) | `no-key` |

## Rules for every batch

- **Write `stackAlignment` and `stackDistribution` on every stack you create:** a stack centers its children by
  default. One edge per column, left by default.
- **Equal heights:** grid `gridRowHeightType="auto"` with cells `height="1fr"`; cards in a row `height="1fr"` with
  `stackDistribution="start"`.
- **One content width** (`maxWidth` + side padding) for the header, every section and the footer.
- **Links on frames,** not on text nodes (Framer's default blue); a component gets a Link property, never a wrapper
  frame around its instance.
- **Headings:** `balance: true` on their text styles; display tracking negative, line height ≤ 1.1.
- **Spacing from the scale** (4…128), grouped by distance; text never touches a visible edge.
- **Real visuals, never icons as the visual:** one warm, candid art direction from the subject's world, picked from a
  contact sheet.
- **Hover changes one thing** (a color or an arrow cue), and only on what is clickable.
- **Anything that moves or responds:** write its states and transitions before building it and build every row
  (`motion`, States first); then go through them on the published site or Preview in a real browser (`verify`).
- **After every `design_apply`, fix every defect in its `audit`;** before calling a page done, run `layout_audit` and
  look at every breakpoint.
