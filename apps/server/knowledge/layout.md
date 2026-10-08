# How layout works in Framer

How stacks, grids, sizes and breakpoints behave, and how to build a layout the design asks for. Attribute names are
the DSL names `nodes_read` prints and `design_apply` takes. The design itself (alignment, spacing, widths, sizes) is
the user's and the site's: take it from them and from the site's own styles. Framer fixes none of the cases below for
you, and most fail silently.

## Stack alignment

- A stack places fit-width children (`width="auto"` or px) by its `stackAlignment`, which **defaults to center**.
  Fill-width text (`width="1fr"`) places its lines by its own text alignment. In one stack a fit child and fill text
  can therefore land on different edges.
- Write `stackAlignment` and `stackDistribution` on every stack you create, set to what the design asks; the defaults
  are rarely what was meant.

## Distribution on the main axis

- `space-between`, `space-around` and `space-evenly` ignore `gap`, and Framer refuses a gap with them.
- Three groups spread across a row (for example a logo, links and a button): three children with `width="1fr"`, the
  first `stackDistribution="start"`, the middle `center`, the last `end`. `space-between` centers the middle group only
  when both sides are equally wide.
- A child stretched to its row (`height="1fr"`) with `stackDistribution="center"` floats its content to its middle, so
  stretched cards with different content start at different heights; `start` keeps it at the top.
- To pin a child to the bottom of a stretched card: the card holds the content group (`height="auto"`), a spacer
  (`height="1fr"`) and that child, as direct children. A `1fr` wrapper around them in a card of an auto-row grid adds
  nothing to the row's height and clips the card.

## Sizes

- Text in a vertical stack fills it with `width="1fr"`; text in a frame without a stack uses `100%`; text that should
  hug (a label, a badge, a menu item) uses `auto`. A content wrapper with a limit is `1fr` + `maxWidth`.
- Never a fit parent (`auto`) with a fill child (`1fr`) on the same axis: Framer silently switches the parent to fixed
  and it breaks at other widths. If the parent hugs, the child is `auto` or px.
- Limits are `minWidth` / `maxWidth`; a fixed width does not adapt. A `minWidth` above the phone width minus the side
  padding scrolls the page sideways.
- `height="auto"` with `minHeight` adapts to content; a fixed height clips it when the content grows.

## Equal heights

When the design asks for items of one height:

- **Grid:** `gridRowHeightType="auto"` and every cell `width="1fr" height="1fr"`; groups inside the cells
  `height="auto"`; a floor is `minHeight` on the item. Cells are centered in their row by default, so `height="auto"`
  cells end at ragged lines.
- **Horizontal stack:** each item `height="1fr"`, the stack `height="auto"`.
- **CMS list:** the item and its card fill the cell; the list itself fits its content.
- **Separate instances** (slides, a stacked deck): nothing evens them out; the component's `minHeight` does.
- `height="1fr"` in a wrapping stack fills its row, not the parent's `minHeight`.

## Grids

- Responsive columns: `gridColumnCount="auto-fill"` with `gridColumnMinWidth`, instead of a fixed count.
- A grid that becomes a list on a breakpoint: switch to `layout="stack" stackDirection="vertical"`, children
  `width="1fr" height="auto"`.
- Rows of different heights in one block: separate grids in a vertical stack.
- Masonry: `gridMasonry="true"` puts each item in the column that is shortest at that point (the left one on a tie),
  so the order of items decides whether the columns end level. Turn it off on a breakpoint with `gridMasonry="null"`.

## Containers

- Backgrounds that span the window with content held to a width: Section (full width, its own fill) > Container
  (`width="1fr"`, `maxWidth`, side padding) > content.

## Breakpoints

- Add breakpoints before text styles get their sizes; how copies take overrides is in `dsl`, Breakpoints. Every copy
  has a `width`.
- When a row becomes a column on a breakpoint, reset its children's `fr` weights: copies left at `7fr`/`5fr` in a
  vertical stack keep their text on one line and clip it. Give them `width="1fr"` there.
- A layer hidden on one breakpoint: `visible="false"` on its copy there.
- A layer that fills the screen: `height="auto"` + `minHeight="100vh"`. A fixed `100vh` clips its content on short
  screens.
- Text style sizes per breakpoint: read `text_styles_list` before trusting them: a slot left from older breakpoints
  can make tablet sizes smaller than phone ones (`dsl`, Breakpoints). After styles change through the Plugin API, run
  `framer_connect { reconnect: true }` before the next DSL batch.
- A layout template holds the shared header and footer: `+LayoutTemplateNode` in `design_apply` dsl makes its Desktop
  at 1200 (set it to the pages' width) with a placeholder. `breakpoints_add` takes pages only, so give the template
  Tablet and Phone with `CREATE_VARIANT <tmp> from="<template Desktop id>"` and `SET <tmp> name="Tablet" width="810px"
  left="…" height="800px"`: template breakpoints need a fixed px height (`auto` is refused). The header goes at
  `index="0"` before the placeholder, the footer after it. Join pages with `site_settings_set` (`layoutTemplate`). They
  keep their own breakpoints, which then refuse `fill` and `layout`: set those on the template's breakpoints. A page's
  `layout_audit` skips the template: audit the template's breakpoint by its id.
- No horizontal scroll: no px widths above the breakpoint width minus padding, no absolute layers outside the frame.
  Effects count too: an appear or scroll-transform start state with an x offset, rotation or scale past the screen
  edge scrolls the page sideways on phones. Keep start offsets inside the section, or put the moving layer in a parent
  with `overflow="clip"` (never `hidden`, which breaks sticky).

## Items made of two pieces

- An item of two pieces side by side (a text panel and a photo) with rounded corners: the component's root gets the
  fill, the radius and `overflow="clip"`, `padding="0px"` and `gap="0px"`; the photo has no radius of its own, the root
  clips the corners. A transparent gap between the pieces shows whatever is behind them (the item under it in a
  sticky stack, the next slide in a slider).

## Layers stretched over their parent

- A frame stretches by its pins alone: `position="absolute"` with `left`, `right`, `top`, `bottom` at `0px`.
- **A component instance does not:** it keeps its own `width` and `height`, which default to `auto`, so a pinned
  instance (a full-bleed video) collapses to its content. Give it `width="100%" height="100%"` together with the pins.
  `layout_audit` reports it as `pinned-instance-auto`.
- Text in an absolute layer pinned `left` and `right` gets `width` auto and does not wrap: give it `width="100%"` or a
  px width.

## Overflow, sticky, z-index

- `overflow="clip"`, never `hidden`: hidden breaks sticky anywhere inside it. A clip container cuts shadows and hover
  scale of its children unless it has padding for them.
- A sticky header is a direct child of the breakpoint (or the layout template) at `index="0"`, with its own fill and a
  `zIndex` above the content; a sticky layer only sticks within its parent.
- `position="fixed"` works only on a direct child of the page breakpoint (Framer Help): a fixed layer lives there, not
  inside a section.

## Images

- An image frame needs a size: `width="1fr"` + `aspectRatio` + any px height, or a fixed height. A frame with an image
  fill, no children and `height="auto"` collapses to 0. A circle is `width` + `aspectRatio="1"`.
- A file narrower than about twice its shown width looks soft on high-density screens. `altText` on every meaningful
  image (`images_check` and `a11y_audit` look for it).

## Links on buttons and text

- A link on a text node takes Framer's default link color (blue): put the link on the frame around the text, or give
  the site link styles (`link_styles_upsert`, needs a key).
- A button or tab that is a component gets a Link property bound to its root, never a frame wrapped around the
  instance (`motion`, Links on components).

## Mixed sizes in a row

- Stacks have no baseline alignment. A value with a smaller unit: `stackAlignment="end"` with matching px line
  heights, or nudge the smaller text with padding. Keep value and unit in a stack, never in a frame without layout.
