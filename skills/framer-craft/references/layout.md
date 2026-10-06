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

- **`gap` with `stackDistribution="space-between"` is an error** (the node is created and the gap ignored), and
  without a gap the linter then asks for one. Use `stackDistribution="start"` with a `1fr` spacer child and the gap you
  want.
- **Cards of one set share one height** wherever they appear, together or in turn. Separate instances (slides, a
  stacked deck) get it from the card component's `minHeight`.
- **No stretch alignment.** For equal-height columns, give the children `height="1fr"` in a horizontal stack with
  `height="auto"`: they stretch to the tallest sibling.
- **A wrapping stack collapses with `width="auto"`.** With `stackWrapEnabled="true"` it silently becomes one column.
  Give it `1fr` or `100%`.
- **`height="1fr"` in a wrapping stack fills its row,** not the parent's `minHeight`.
- **`gap="A B"`:** A is the gap between rows, B the gap between columns.
- **Padding goes on containers**, not on text nodes.

## Grids

- **`gridRowHeightType="auto"`** makes every row as tall as the tallest one. Cells with `height="1fr"` then fill their
  row. Use it for multi-column grids.
- **A button at the bottom of every card:** the card (`height="1fr"` in an `auto` row) holds, as direct children, the
  content group (`height="auto"`), a spacer (`height="1fr"`) and the button. A `height="1fr"` body wrapper between the
  card and them adds nothing to the row's height and clips the cards, with no error.
- **One column:** on a breakpoint where the grid becomes one column, switch to `fit`, or short cells leave empty bands.
  In multi-column rows, `fit` shows the grid's fill under short cells.
- **Bento with rows of different heights:** build separate grids in a vertical stack with `gap`. In one grid, a tall
  row inflates every other row.
- **Reflowing columns:** `gridColumnCount="auto-fill"` with `gridColumnMinWidth` reflows the columns by itself (5, then
  3, then 1).
- **Grid lines without double borders:** give the parent a fill in the line color and `gap="1px"`, and fill the cells
  with the page background.
- **Masonry:** `gridMasonry="true"` puts each item in the column that is shortest at that point (the left one on a
  tie), so the order of items decides whether the columns end level: order them so each column's heights add up the
  same. Turn it off on phone with `gridMasonry="null"`.

## Absolute layers

- **Pins are px only.** A `%` pin fails with "Expected a pixel value". Width and height take px or %, never `fr`.
- **Stretch over the parent:** pin all four sides to `0px`. Not width and height 100%, and never `auto`: the layer
  collapses. **A component instance is the exception:** pinned, it keeps its own size (`auto` by default) and
  collapses to its content; give it `width="100%" height="100%"` with the pins.
- **Center:** `centerAnchorX="50%"` (or `centerAnchorY`) with no pins on that axis. Framer refuses to create an
  absolute node without pins, so create it pinned; then, in a second `SET`, set those pins to `null` and add the
  anchor.
- **Full width with its own height:** pin `left="0px"` and `right="0px"`, and set the height.
- **Text in an absolute layer pinned left and right** gets `width auto` and does not wrap. Give it `width="100%"`.

## Breakpoints

- **A page is a primary breakpoint frame plus replicas.**
  `CREATE_VARIANT tablet from="<primary id>"; SET tablet name="Tablet" width="810px" left="<x>px" top="0px";`
  - Always give `width`: without it the replica copies 1200 and breaks the media query.
  - Place replicas side by side without overlap.
  - `$rect` can be stale: right after a size change it still shows the old size, and a replica placed from it overlaps
    Desktop ("Ground nodes overlap each other"). Place each replica from the widths you wrote (previous `left` + its
    width + 100). Nodes inside stacks carry no `$rect`, so judge sizes from screenshots.
- **Read the project's breakpoints first.** A new page has only Desktop 1200. The set to build is Desktop 1440
  (primary), Laptop 1280, Tablet 810 and Phone 390.
- **All breakpoints on every page before text style sizes.** A style's breakpoint slots start at the breakpoints that
  exist when they are written, counted over every page of the site, the home page (`/`) included, not only the page
  you style. A breakpoint added later, or one page left at another width, leaves slot starts that put desktop type on
  the tablet layout or tablet sizes below phone ones, and the style must be recreated to follow the new set. Give
  every page the final set first, and read every style's sizes back before handoff: tablet sits between laptop and
  phone.
- **A page on a layout template takes its breakpoints' fill and layout from the template:** a `fill` or `layout` on
  the page breakpoint is refused; set it on the template's breakpoints.
- **Override a node on a replica** with the compound id `<replica id><node id>`, written with no separator.
  - Use real ids. A real replica id joined with a temp id from the same batch fails: create the node in one batch, then
    override it in the next.
  - Temp-plus-temp compounds inside a new component do work.
- **An override cannot be reset to inherit** through the DSL. Writing the primary's value only pins that value.
- **Reordering on a breakpoint:** Framer's reference says to `MOVE` a replica descendant within its parent. The `MOVE`
  is accepted and `serialize` shows the new order, but the breakpoint keeps rendering the primary's order. Instead,
  put a second copy of the layer at the new position in the primary, hidden there (`visible="false"`) and shown on the
  replicas that need it, with the original hidden on those replicas. Check the order in a screenshot.
- **A row turned into a column keeps its `fr` weights.** Children with `width="7fr"` and `"5fr"` in a row switched to
  `stackDirection="vertical"` stay on one line and clip. Set `width="1fr"` on those children's copies too.
- **On phone**, grids usually become vertical stacks. Check text wrapping and overflow on every replica. Cards that
  stick and stack go `position="relative"` on phone when they are taller than the screen, or their bottoms can never
  be read. A card laid over the hero media is hidden on tablet and phone (a boolean variable), where it covers the
  headline.
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
- **`position="fixed"` works only on a direct child of the page breakpoint** (Framer Help). A floating button or a
  fixed bar lives there, not inside a section.
- **Sticky:** `position="sticky"` with `positionStickyTop`. A sticky layer creates its own stacking context, so it
  carries its own background and does not show a parent's gradient through.
- **A translucent card over an overlay** lets the overlay show through. Make the card root opaque (the section color)
  and put the tint in an inner layer pinned `0px`.
- **A hairline seam between two gradient sections** appears on a fractional y. Extend the lower one 2px upward:
  `top` −2, height +2.

## Navigation and links

- **Sticky header:** `positionStickyTop="0"` with a fill, so content scrolls under it. A header that changes on scroll
  is a header component with two variants switched by a `scrollVariantEffect` (`onScrollTarget`) aimed at the first
  section after the hero ([scroll.md](scroll.md), Scroll Variants). A header that hides on scroll down needs code.
- **Phone menu:** a component with closed and open variants that opens by height ([components.md](components.md)).
  Current-page links get `link.current.*` styles. Every link in the open variant also switches the menu to its closed
  variant; on links to absolute URLs give that switch a 0.1s delay, or iOS can drop the navigation. The open menu lies
  over the page rather than pushing the content down. Links that are component instances take no `onTap`: give the
  link component an `EventHandlerVariable` fired by `onTap.0.action="TRIGGER_EVENT"`, and on each instance in the open
  variant set `onClick.0.action="SET_VARIANT"` to the closed variant.
- **Section links:** a link to `/#id` needs the target to have `elementId` and `scrollTargetEnabled="true"` first;
  setting them earlier in the same batch works. Without the target the command errors, but the node keeps the link
  cut to the page (`/page`, no `#id`): set it again once the target exists, so build navigation last. Give every frame
  that links to `#id` `link.smoothScroll="true"`, inside the button and nav link components too, and each target
  section `scrollMarginTop` = sticky header height + gap − the section's top padding, or the header covers its heading.
- **External links start with `https://`:** `link.href="www.example.com"` is stored as is, without a warning, and on
  the site it is the relative path `/www.example.com`.

## Text and nodes

- **Tabular figures:** on a text node that has a text style, `openTypeFontFeatures.tnum` is refused ("Cannot apply
  preset-controlled text properties"): give the figures a text style of their own (`Figure`) and set the feature there.
- **Typography rewrites characters.** Framer replaces straight quotes with curly ones and `...` with `…`. Write code
  samples without quotes.
- **DSL values cannot contain line breaks.** Break a headline with `maxWidth` or separate blocks.
- **`/` in a node name** keeps only the last segment. (For styles and components, `/` makes folders instead.)
- **Names:** `SET x name=""` removes a name; `name="null"` sets the literal word.
- **`MOVE x parent="…" index="n"`:** n is the final position among the children.
- **Pages:** DSL `DEL` does not delete a `WebPageNode`; use `framer.removeNodes([id])`. The plugin API cannot change a
  page's path, but the DSL can: `SET <page id> path="/new-path";`. Address the page by its new path afterwards, and
  redirect the old one if the site was published.
- **Layout templates:** a `LayoutTemplateNode` (shared header and footer) is edited like any node, by id. On a page
  that uses a template, the page-level `flowEffect` goes on the template's breakpoint.
  - **Create:** `+LayoutTemplateNode lt name="Site Template";` makes a Desktop breakpoint (1200×1000) holding a
    `PlaceholderNode`. Add Tablet and Phone with `CREATE_VARIANT ltTab from="<template Desktop id>"; SET ltTab
    name="Tablet" width="810px";`. The header is a child of the template Desktop at `index="0"`, before the placeholder;
    the footer goes after it. Adapt them per breakpoint by compound id `<template breakpoint id><node id>`.
  - **Join a page:** `SET <page id> layoutTemplate="<template id>";`. The page still needs its own breakpoints, and they
    then refuse `fill` and `layout` ("Apply it to the corresponding breakpoint of layout template").
  - **A template breakpoint needs a fixed px height** (`height="800px"`). `height="auto"` is refused: "Layout template
    breakpoints require a fixed pixel height".
  - Give the pages that use the template the same breakpoints (Desktop 1440, Laptop 1280, Tablet 810, Phone 390),
    and switch a shared header instance per template breakpoint with `$control__variant`.
  - A sticky header in a template: the instance gets `position="sticky"`, `positionStickyTop="0"`, `zIndex="5"`,
    `width="1fr"`, at `index="0"` above the placeholder.
