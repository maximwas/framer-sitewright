---
name: sitewright
description: >
  Use when changing, fixing or reviewing a Framer site through the Sitewright MCP server (design_apply, nodes_read,
  color_tokens_*, text_styles_*, layout_audit): one section or page, CMS, motion or breakpoints, or a page that is
  misaligned, uneven or broken on phones.
---

# Building in Framer with Sitewright

Sitewright carries out the work in Framer; the design decisions are the user's and the site's. The guide to how
Framer behaves is served by the MCP server, so it matches the installed version: read a topic with `framer_guide`.

| When | Topic |
| --- | --- |
| Before the first `design_apply` of a session | `dsl` |
| Placing anything: stacks, grids, sizes, breakpoints, images | `layout` |
| Anything that moves or responds: menus, sliders, tabs, accordions, scroll scenes, page transitions | `motion` |
| Before saying a page is done, and at handover | `verify` |
| A template for the Framer Marketplace | `template` |
| No Server API key (plugin only) | `no-key` |

## For every batch

- **Build in the site's own system:** its tokens, text styles and components. Take anything the site has no style for
  from the user.
- **Write `stackAlignment` and `stackDistribution` on every stack you create:** a stack centers its children by
  default, which is rarely what the design means.
- **Links on frames,** not on text nodes (those take Framer's default blue); a component gets a Link property, never a
  wrapper frame around its instance.
- **Anything that moves or responds:** list its states before building it and build every row (`motion`, States);
  then go through them on the published site or Preview in a real browser (`verify`).
- **After every `design_apply`, fix every defect in its `audit`;** before calling a page done, run `layout_audit` and
  look at every breakpoint.
