# Workflow: building or restyling a site

Follow this order for any new page, section set or redesign. The other topics hold the rules each step uses:
`direction`, `layout`, `typography`, `sections`, `verify`, `template` when the site is a Framer Marketplace template,
and `no-key` when there is no Server API key.

## 1. Brief (`project_brief`)

- Call `project_brief` before anything else. It returns the questions still open for this project, essentials first:
  purpose and main action, whose site it is (a Marketplace template follows `template`), name, pages, references,
  mood, palette, theme, assets, copy and motion level; then audience, fonts, imagery, CMS collections, languages,
  features, SEO and handoff; then plan, screens, analytics and accessibility.
- Ask in rounds of up to four questions, with each question's options. Where it says `propose`, make the proposals
  for this project (three palettes with hex values and AA contrast, two or three font pairings, directions from
  `marketplace_browse`) and offer them as the options.
- A skipped question or "decide yourself" takes its fallback; say which. Save after every round
  (`project_brief { answers }`): the brief stays with the project, so later work reads it instead of asking again.
- Missing assets become part of your proposal: a drawn SVG mark, stock photos, named placeholders listed at handoff.

## 1b. Look at the market

- Read what sells now in the brief's category: `marketplace_browse` (templates, category `agency`, `consulting`,
  `saas`…). Open two or three previews and name what they do that the plan lacks: the scale of the type, how big the
  images are, the section rhythm, the motion. A page that is only clean and correct reads as unfinished next to them.
- For a carousel, ticker or effect, offer the user two or three free Marketplace components (`marketplace_browse`
  components, `freeOnly`) with their previews, or to build it natively with variants; insert the chosen one with
  `component_insert`.

## 2. Direction before any node (write it out, then check it)

Write a compact plan in the conversation:

1. **Palette:** 4–6 named values with hex (base with a temperature, ink, muted ink, line, one accent).
2. **Type:** one or two families and their roles; display size, weight, tracking and line height; body size.
3. **Layout concept:** one sentence; the alignment (left by default; centered only for one or two moments); the
   container (one width for header, sections and footer); the section rhythm (one padding value).
4. **Imagery:** what the visuals are (client photos, product shots, stock with one art direction) and where they go.
5. **Signature:** the one thing the page is remembered by.
6. **Motion level:** offer subtle, balanced or expressive with the effects each adds per section (`motion`, Motion
   menu), and build what the user picks; a template defaults to balanced.

Then read `direction` ("Looks that read as generated") and change every part that any similar brief would get.

## 3. Design system

- Color tokens by role, with dark values. Text styles per role (Heading 1–3, Body, Body Small, Label, Button), each
  with its alignment set on purpose, `balance: true` on headings, tracking and line height from `typography`, and
  breakpoint slots for display sizes.
- One spacing scale (4, 8, 12, 16, 24, 32, 48, 64, 96, 128) and one radius rule.

## 4. Structure, then sections

- Page frame: breakpoint root with `layout="stack" stackDirection="vertical" stackAlignment="center"`,
  `height="auto"`. Sections full width (`width="1fr"`), each with a Container (`width="1fr"`, the one `maxWidth`, the
  same side padding) — the header and footer too.
- One `design_apply` batch per section. Set `stackAlignment` and `stackDistribution` explicitly on every stack you
  create; never rely on Framer's defaults (a stack centers its children by default).
- Read `design_apply`'s `audit` after every batch and fix every `defect` before the next section.

## 5. Breakpoints

- The set is Desktop 1440 (primary), Laptop 1280, Tablet 810 and Phone 390: set the primary's `width` to 1440, then
  add the others with `breakpoints_add` (no key needed), and the same set on a layout template.
- Add every breakpoint **before** giving text styles their sizes (`text_styles_upsert` breakpoints): a style's slots
  start at the page's breakpoints as they are when you write them. A breakpoint added later leaves the old slot
  starts, and `text_styles_upsert` then refuses new slots ("would not start in order") until the style is recreated.
- Adapt each breakpoint by overriding its copies with `design_apply` xml, by compound id
  `<breakpoint id><node id>` (`nodes_read` on the breakpoint lists them): section padding ×0.5 on phone, side padding
  16–24px, grids of 3+ columns become one column (`layout="stack" stackDirection="vertical"`), columns side by side
  stack vertically, images keep their `aspectRatio`, the header keeps the wordmark and one action (the other links get
  `visible="false"` on their copies) unless there is a menu component.
- New layers go into the primary breakpoint; a copy takes overrides, not children.
- `layout_audit` lists what a narrow breakpoint kept from desktop (`narrow-grid`, `narrow-row`, `narrow-padding`,
  `narrow-type`): fix them all.

## 6. Verify before saying it is done

- `layout_audit` on the page: fix every defect, then the likely ones; weigh the taste ones against the direction.
- Look at it: with a key, `node_screenshot` of every breakpoint; without one, ask the user to look, or publish only
  when they ask. Run the checklist in `verify`.
- Tell the user what is still needed from them (images, copy, fonts) and which taste findings you kept on purpose.
