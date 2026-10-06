# Layout

## Page structure

Build every page as Main > Section > Container > Content:

- **Section** spans the full window width (`width="1fr"`). Its fill, gradient or photo lives here, so the background
  reaches the window edges at any width.
- **Container** sits inside the section: `width="1fr"`, `maxWidth="1440px"` (or the design's content width), centered.
  Header and footer follow the same pattern.
- **Background:** when a section's background is a scene (gradient, glow, blur, photo), put all of its layers into one
  absolute frame named `Background`, pinned `0px` on all four sides, behind the Container.
- Name layers by role (`Hero`, `Container`, `Content`, `Background`), never `Frame 12`.
- One `h1` per page. Headings get their tag from the text style (`tag="h2"`). Images get `altText`.

## Widths and heights

- **Width by role:** text in a stack gets `width="1fr"`, text in a frame `100%`, buttons `auto`.
- **Limits:** a limit is `maxWidth`, never a fixed px width.
- **Height:** use `height="auto"` with `minHeight` instead of fixed heights. Fixed heights are only for:
  - icons and avatars;
  - media with `aspectRatio`;
  - the closed variant of something that opens.
- **Hero:** `height="auto"` with `minHeight="100vh"`.
- **`aspectRatio` needs a px height.** Any px value works, because the ratio wins. With `height="auto"` it is an
  error.
- **Circle that grows with the window:** `width` in %, plus `aspectRatio="1"`, plus any px height. A % width with a
  fixed height and `radius 9999` gives a squashed capsule instead.
- **Layer that scales with the window** (a glow wider than the viewport): keep its sizes in %, as whole numbers (237%,
  not 3411px). A px layer placed for 1440 drifts off on 1920 and wider screens.
- **Proportional segments without fixed heights:** give children of a vertical stack `fr` weights (`height="3fr"`,
  `height="7fr"`). Lengths from the design become weights.
- **`1fr` children need a parent layout.** They are refused when the parent has no layout, so set `layout="stack"` on
  the parent first. A fresh breakpoint frame has no layout.

## Stacks

- **`gap` with `stackDistribution="space-between"` is an error.** The node is created and the gap ignored, so pick one
  of the two.
- **No stretch alignment.** For equal-height columns, give the children `height="1fr"` in a horizontal stack with
  `height="auto"`: they stretch to the tallest sibling.
- **A wrapping stack collapses with `width="auto"`.** With `stackWrapEnabled="true"` it silently becomes one column.
  Give it `1fr` or `100%`.
- **`gap="A B"`:** A is the gap between rows, B the gap between columns.
- **Padding goes on containers**, not on text nodes.

## Grids

- **`gridRowHeightType="auto"`** makes every row as tall as the tallest one. Cells with `height="1fr"` then fill their
  row. Use it for multi-column grids.
- **One column:** on a breakpoint where the grid becomes one column, switch to `fit`, or short cells leave empty bands.
  In multi-column rows, `fit` shows the grid's fill under short cells.
- **Bento with rows of different heights:** build separate grids in a vertical stack with `gap`. In one grid, a tall
  row inflates every other row.
- **Reflowing columns:** `gridColumnCount="auto-fill"` with `gridColumnMinWidth` reflows the columns by itself (5, then
  3, then 1).
- **Grid lines without double borders:** give the parent a fill in the line color and `gap="1px"`, and fill the cells
  with the page background.

## Absolute layers

- **Pins are px only.** A `%` pin fails with "Expected a pixel value". Width and height take px or %.
- **Full width with its own height:** pin `left="0px"` and `right="0px"`, and set the height.
- **Text in an absolute layer pinned left and right** gets `width auto` and does not wrap. Give it `width="100%"`.

## Breakpoints

- **A page is a primary breakpoint frame plus replicas.**
  `CREATE_VARIANT tablet from="<primary id>"; SET tablet name="Tablet" width="810px" left="<x>px" top="0px";`
  - Always give `width`: without it the replica copies 1200 and breaks the media query.
  - Place replicas side by side without overlap.
- **Read the project's breakpoints first.** A new page has only Desktop 1200. The set to build is Desktop 1440
  (primary), Laptop 1280, Tablet 810 and Phone 390.
- **All breakpoints before text style sizes.** A style's breakpoint slots start at the page breakpoints that exist when
  they are written; a breakpoint added later leaves the old starts in place, and the style must be recreated to follow
  it.
- **Override a node on a replica** with the compound id `<replica id><node id>`, written with no separator.
  - Use real ids. A real replica id joined with a temp id from the same batch fails: create the node in one batch, then
    override it in the next.
  - Temp-plus-temp compounds inside a new component do work.
- **An override cannot be reset to inherit** through the DSL. Writing the primary's value only pins that value.
- **On phone**, grids usually become vertical stacks. Check text wrapping and overflow on every replica.
- **To drop a side border on a breakpoint**, make its color transparent. `borderRight="0"` gives the error "Border is
  incomplete".
- **A connector that turns into a down arrow:** a horizontal connector (width 40px) gets `rotation="90deg"` in a
  vertical stack on phone, with no new nodes.

## Overflow, z-index, sticky

- **Use `overflow="clip"`, not `hidden`.** `hidden` breaks sticky.
- **`zIndex="0"` is a real CSS `z-index: 0`.** It is its own stacking context, even though `serialize` does not show
  it. The DSL cannot remove it: only numbers up to 10 are accepted, and `null` or `auto` are errors.
- **A section with any zIndex traps its children.** A page-level overlay (grid lines) then ends up under or over all of
  its content. Keep sections without zIndex: background layers z0, overlay z1, content z2.
- **Sticky:** `position="sticky"` with `positionStickyTop`. A sticky layer creates its own stacking context, so it
  carries its own background and does not show a parent's gradient through.
- **A translucent card over an overlay** lets the overlay show through. Make the card root opaque (the section color)
  and put the tint in an inner layer pinned `0px`.
- **A hairline seam between two gradient sections** appears on a fractional y. Extend the lower one 2px upward:
  `top` −2, height +2.

## Text and nodes

- **Typography rewrites characters.** Framer replaces straight quotes with curly ones and `...` with `…`. Write code
  samples without quotes.
- **DSL values cannot contain line breaks.** Break a headline with `maxWidth` or separate blocks.
- **`/` in a node name** keeps only the last segment. (For styles and components, `/` makes folders instead.)
- **Names:** `SET x name=""` removes a name; `name="null"` sets the literal word.
- **`MOVE x parent="…" index="n"`:** n is the final position among the children.
- **Pages:** DSL `DEL` does not delete a `WebPageNode`; use `framer.removeNodes([id])`. A page's path cannot be
  changed.
- **Layout templates:** a `LayoutTemplateNode` (shared header and footer) is edited like any node, by id. On a page
  that uses a template, the page-level `flowEffect` goes on the template's breakpoint.
  - **A template breakpoint needs a fixed px height** (`height="800px"`). `height="auto"` is refused: "Layout template
    breakpoints require a fixed pixel height".
  - Give the pages that use the template the same breakpoints (Desktop 1440, Laptop 1280, Tablet 810, Phone 390),
    and switch a shared header instance per template breakpoint with `$control__variant`.
  - A sticky header in a template: the instance gets `position="sticky"`, `positionStickyTop="0"`, `zIndex="5"`,
    `width="1fr"`, at `index="0"` above the placeholder.
