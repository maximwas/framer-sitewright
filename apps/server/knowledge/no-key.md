# Working without a Server API key (the plugin only)

Without a key, `design_apply` and `nodes_read` run through Framer's Plugin API. What that path can and cannot do, and
how to get the same result anyway.

## Works

- Frames (`FrameNode`) and text (`RichTextNode` with plain text) — created, changed, moved, deleted.
- Layout: `layout` (stack, grid), `stackDirection`, `stackAlignment`, `stackDistribution`, `stackWrapEnabled`, `gap`,
  `padding`, grid columns, rows and item placement.
- Size and position: `width`, `height`, min/max, `aspectRatio`, `position`, pins, `centerAnchorX/Y`, `zIndex`,
  `rotation`, `opacity`, `visible`, `overflow`.
- Look: `fill` (a color or a token), `radius`, `border`, `link` (on frames), `textStylePreset`.
- Tokens and text styles (`color_tokens_upsert`, `text_styles_upsert`, including alignment and `balance`), SVG
  (`svg_add`), image upload (`image_upload`), component controls, code files when allowed.

## Needs a key (the DSL)

- Effects and motion (hover, appear, loop, scroll), variants and components, rich text blocks and runs, `textColor`
  and `type` on a text node, shadows, gradient and image fills on nodes, link styles, breakpoint replicas,
  screenshots, stock photo and icon catalogs.

## Same result anyway

- **Text color:** put the color on the text style (`color: { token }`); one style per color role.
- **Text links:** a link on a text node takes Framer's default link color (blue). Put the link on a frame around the
  text instead: a nav item or button frame with `layout="stack"` and padding.
- **Headline wrapping:** `balance: true` on the heading styles.
- **Equal heights, alignment, containers:** all layout attributes work; follow `layout`.
- **Images:** upload with `image_upload` and tell the user where each image goes until image fills are available
  without a key; never replace them with icons.
- **Breakpoints:** build the desktop layout so it holds at every width (fill widths, `maxWidth`, wrapping stacks,
  `gridColumnCount="auto-fill"`), and tell the user that tablet and phone tuning needs a key.

When a batch asks for something on the key-only list, it is refused whole before any change; the message says what.
