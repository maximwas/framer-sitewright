# Working without a Server API key (the plugin only)

Without a key, `design_apply` and `nodes_read` run through Framer's Plugin API. What that path can and cannot do, and
how to get the same result anyway.

## Works

- Frames (`FrameNode`) and text (`RichTextNode` with plain text) — created, changed, moved, deleted.
- Layout: `layout` (stack, grid), `stackDirection`, `stackAlignment`, `stackDistribution`, `stackWrapEnabled`, `gap`,
  `padding`, grid columns, rows and item placement.
- Size and position: `width`, `height`, min/max, `aspectRatio`, `position`, pins, `centerAnchorX/Y`, `zIndex`,
  `rotation`, `opacity`, `visible`, `overflow`.
- Look: `fill` (a color, a token, a `linear-gradient(…)` with colors or tokens, or an image URL: uploaded to the
  project and set as the frame's image), `radius`,
  `border`, `link` (on frames), `textStylePreset`.
- Tokens and text styles (`color_tokens_upsert`, `text_styles_upsert`, including alignment, `balance` and breakpoint
  sizes), SVG (`svg_add`), image upload (`image_upload`), component controls, code files when allowed.
- CMS: collections, fields and items (`cms_*` tools). A key is needed to delete a whole collection, and for the search
  for layers bound to a field before `cms_fields_set` removes it: without one, the removal goes through unchecked.
- Translations need the key: Framer gives a plugin the translations only in its Localization mode, and the Sitewright
  plugin runs on the canvas. `locales_list` works without one.
- Breakpoints: `breakpoints_add`, then overrides on their copies by compound id `<breakpoint id><node id>`; undo
  brings a deleted breakpoint back with its overrides.

## Needs a key (the DSL)

- Effects and motion (hover, appear, loop, scroll), variants and components, rich text blocks and runs, `textColor`
  and `type` on a text node, shadows, radial and conic gradients, link styles, screenshots and the icon catalog.

## Same result anyway

- **Text color:** put the color on the text style (`color: { token }`).
- **Text links:** a link on a text node takes Framer's default link color (blue). Put the link on a frame around the
  text instead: a nav item or button frame with `layout="stack"` and padding.
- **Even line lengths:** `balance: true` on the text style.
- **Equal heights, alignment, containers:** all layout attributes work (`layout`).
- **Images:** `fill="https://…"` on a frame with a size (`width="1fr"`, `aspectRatio`, any px height) uploads the image
  and fills the frame.
- **Breakpoints:** fill widths, `maxWidth` and wrapping stacks adapt by themselves; add Tablet and Phone with
  `breakpoints_add` and override their copies (`dsl`, Breakpoints). A menu that opens needs a component, so a key.

When a batch asks for something on the key-only list, it is refused whole before any change; the message says what.
