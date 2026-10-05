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
- CMS: collections, fields and items (`cms_*` tools); only deleting a whole collection needs a key.
- Translations: `locales_list`, `localization_get`, `localization_set` (the user adds locales in the editor).
- Breakpoints: `breakpoints_add`, then overrides on their copies by compound id `<breakpoint id><node id>`; undo
  brings a deleted breakpoint back with its overrides.

## Needs a key (the DSL)

- Effects and motion (hover, appear, loop, scroll), variants and components, rich text blocks and runs, `textColor`
  and `type` on a text node, shadows, radial and conic gradients, link styles, screenshots, stock photo and icon
  catalogs.

## Same result anyway

- **Text color:** put the color on the text style (`color: { token }`); one style per color role.
- **Text links:** a link on a text node takes Framer's default link color (blue). Put the link on a frame around the
  text instead: a nav item or button frame with `layout="stack"` and padding.
- **Headline wrapping:** `balance: true` on the heading styles.
- **Equal heights, alignment, containers:** all layout attributes work; follow `layout`.
- **Images:** `fill="https://…"` on a frame with a size (`width="1fr"`, `aspectRatio`, any px height) uploads the image
  and fills the frame. Stock search needs a key, so use the client's images or direct image URLs; never icons instead.
- **Breakpoints:** build the desktop layout so it holds at every width (fill widths, `maxWidth`, wrapping stacks),
  then add Tablet and Phone with `breakpoints_add` and override their copies (`workflow`, step 5). A phone menu that
  opens needs a component, so a key: without one, keep the wordmark and one link in the phone header.

When a batch asks for something on the key-only list, it is refused whole before any change; the message says what.
