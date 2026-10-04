# Figma to Framer

For when the Figma MCP is connected.

## Call budget

Figma MCP calls are limited: about 200 a day on a Dev or Full seat, only a handful a month on View or Collab.

- One `get_design_context` per section; keep its result and do not ask again.
- Screenshots only where text is not enough.
- If Figma reports the limit, continue from what you already have.

## Order

1. **Inventory:** pages, frames per breakpoint, variables, text styles, components, assets.
2. **Tokens** from Figma variables (light and dark), with folders as in Figma.
3. **Text styles** with breakpoint slots.
4. **Fonts:** check that Framer has them. If not, tell the user where to get the files.
5. **Desktop**, section by section from top to bottom.
6. **Tablet and Phone** replicas.
7. **Compare screenshots** section by section, at the same container width. The Figma frame is often 1440 while
   Framer's Desktop is 1200: compare the containers, not the frames.

## Mapping

- **Auto layout and widths:** auto layout becomes a stack. Fixed Figma widths become `1fr` with `maxWidth`. Round
  every number to whole px.
- **Layer blur:** CSS `blur` ≈ 0.89 × the Figma value (measured: Figma blur 150 ≈ Gaussian σ 134px).
- **Layer blur plus background blur on one layer** has no Framer equivalent that renders right. Native
  `backgroundBlur` with a mask showed artifacts in screenshots. The canvas and Server API screenshots also draw
  `backdrop-filter` wrongly, so judge it in a browser.
- **A rotated or skewed radial gradient** has no Framer equivalent. Approximate it with an axis-aligned
  `radial-gradient(…)` in CSS, not with an image.
- **Gradient stops:** `px` stops in a `radial-gradient` silently become `%`. Put a gradient shared by two sections on
  their common parent.
- **Logos and icons:** vectors (see [assets.md](assets.md)).

## Assets from Figma

- **Opaque exports:** the Figma MCP exports on an opaque background even for groups without a fill. Cut the alpha
  yourself by matting against the known background color.
- **Separate frames:** layers can be moved into separate frames in Figma to export them.
- **Format:** export at 2×, cut out with alpha, save as WebP, upload with `framer.uploadImage`.
- **Missing SVGs:** SVG assets from a large `get_design_context` often return 404. Request the single node's design
  context and download its assets right away.
- **Scale:** node screenshots do not scale beyond 1×. A 2× image comes only from the raw asset.
- **zsh loops:** `set -- $n` does not split words, so download loops silently hit 404. Use arrays.
