# Workflow: building or restyling a site

Follow this order for any new page, section set or redesign. The other topics hold the rules each step uses:
`direction`, `layout`, `typography`, `sections`, `verify`, and `no-key` when there is no Server API key.

## 1. Brief (ask only what is open, offer defaults)

- The page's one job and its primary action; the audience; pages and who supplies copy and images.
- Brand assets: logo (SVG), fonts, colors, photography. Missing assets become part of your proposal.
- Two or three reference sites and what the client likes in each.

## 2. Direction before any node (write it out, then check it)

Write a compact plan in the conversation:

1. **Palette:** 4–6 named values with hex (base with a temperature, ink, muted ink, line, one accent).
2. **Type:** one or two families and their roles; display size, weight, tracking and line height; body size.
3. **Layout concept:** one sentence; the alignment (left by default; centered only for one or two moments); the
   container (one width for header, sections and footer); the section rhythm (one padding value).
4. **Imagery:** what the visuals are (client photos, product shots, stock with one art direction) and where they go.
5. **Signature:** the one thing the page is remembered by.

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

- Tablet 810 and Phone 390 replicas (needs a Server API key: `CREATE_VARIANT`). Halve section padding on phone, side
  padding 16–24px, display sizes ×0.4–0.67, grids of 3+ columns become one column or a vertical stack.

## 6. Verify before saying it is done

- `layout_audit` on the page: fix every defect, then the likely ones; weigh the taste ones against the direction.
- Look at it: with a key, `node_screenshot` of every breakpoint; without one, ask the user to look, or publish only
  when they ask. Run the checklist in `verify`.
- Tell the user what is still needed from them (images, copy, fonts) and which taste findings you kept on purpose.
