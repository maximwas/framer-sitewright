---
name: sitewright
description: >
  How to build and restyle Framer sites through the Sitewright MCP server so they look designed and hold together: the
  order of work, layout rules Framer does not enforce (one edge per column, equal card heights, one content width,
  links on frames), typography and direction from top Framer sites, and the audit before handing a page over. Use it
  whenever you create or change pages, sections, components, tokens or text styles with Sitewright's tools
  (design_apply, nodes_read, color_tokens_*, text_styles_*), design a site from scratch, or review one.
---

# Building Framer sites with Sitewright

The full guide is served by the MCP server, so it always matches the installed version. Read it with `design_guide`:

Tell the request apart first (`workflow`, step 0): a new site or a redesign goes through the whole order; help with
one part reads the site and builds only that part in its own styles; a fix changes exactly what was asked and checks
that spot on every breakpoint; when unsure, ask.

Before a new site or a redesign, call `project_brief`: ask the user its open questions in rounds of up to four, make
the proposals it asks for (three concepts first; palette and fonts follow the chosen one), and save the answers. On
later work, read the saved brief instead of asking again.

| When | Topic |
| --- | --- |
| Before any new page, section set or redesign | `workflow` (always first, after `project_brief`) |
| Before the first `design_apply` of a session: batches, breakpoints, clicks, forms, overlays, CMS lists, springs, metadata | `dsl` |
| Placing anything: stacks, grids, containers, spacing, breakpoints, layout templates, buttons, images | `layout` |
| Text styles, sizes, tracking, headings | `typography` |
| Choosing the look, avoiding the generated look | `direction` |
| Hero, navigation, features, proof, pricing, FAQ, footer | `sections` |
| Motion to offer (subtle, balanced, expressive), pinned scroll sections, scroll headers, horizontal galleries, page transitions, tabs, links on components | `motion` |
| Before saying a page is done | `verify` |
| A template for the Framer Marketplace | `template` |
| No Server API key (plugin only) | `no-key` |

## Rules for every batch

- **Write `stackAlignment` and `stackDistribution` on every stack you create.** A stack centers its children by
  default: a label or button lands in the middle while the paragraph under it is left-aligned.
- **One edge per column**, left by default; centered only for one or two moments per page.
- **Equal heights:** grid `gridRowHeightType="auto"` with cells `height="1fr"`; a row of cards: each card
  `height="1fr"`; stretched cards keep `stackDistribution="start"`.
- **One content width** (`maxWidth` + side padding) for the header, every section and the footer.
- **Links on frames,** not on text nodes: a text link takes Framer's default blue. A component gets a Link
  property, never a wrapper frame around its instance.
- **Headings:** `balance: true` on their text styles; display tracking negative, line height ≤ 1.1.
- **Spacing from the scale** (4…128), grouped by distance; one section padding; text never touches a visible edge.
- **Real visuals, never icons as the visual:** a page needs a visual system (the client's photos, the product UI with
  believable data, one protagonist object, or a graphic system); text alone reads unfinished. One warm, candid art
  direction from the subject's world; pick each photo from a contact sheet of candidates; people in testimonials and
  contact blocks must read.
- **Cards of two pieces** (text panel + photo) are one solid card: fill, radius and clip on the root, no gap.
- **Hover changes one thing:** a color or an arrow cue; never a label that rolls up or a pill behind a nav link.
- **After every `design_apply`, read its `audit`** and fix every defect before the next section; run `layout_audit`
  on the page before calling it done, then look at it (screenshots with a key, or ask the user).
