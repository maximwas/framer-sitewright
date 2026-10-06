# Layout rules

Attribute names are the DSL names `nodes_read` prints and `design_apply` takes. Each rule says why: Framer does not
fix any of these for you, and most fail silently.

## Alignment: one edge per column

- A stack places fit-width children (`width="auto"` or px) by its `stackAlignment`, which **defaults to center**.
  Fill-width text (`width="1fr"`) places its lines by its own text alignment (usually start). Mixing the two puts a
  label or button in the middle while the paragraph under it is left-aligned.
- Every column has **one edge**: left (`stackAlignment="start"` + left-aligned text styles) or center
  (`stackAlignment="center"` + centered text styles). Mix only on purpose (a centered quote in a left section).
- **Always write `stackAlignment` and `stackDistribution` on every stack you create.**
- Buttons and icons sit on the same edge as the text above them.

## Distribution on the main axis

- `space-between` / `space-around` / `space-evenly` ignore `gap`; pick one of the two.
- A navigation with logo, links and button: three children with `width="1fr"`, the first `stackDistribution="start"`,
  the middle `center`, the last `end`. `space-between` centers the links only when both sides are equally wide.
- A card stretched to its row (`height="1fr"`) keeps `stackDistribution="start"`: with center its content floats and
  the titles of neighbouring cards sit at different heights.
- Buttons at the bottom of every card: put the content in a group with `height="auto"`, then a spacer
  `height="1fr"`, then the button.

## Size by role

- Text in a vertical column: `width="1fr"`. Text in a frame without a stack: `100%`. Button labels, badges, menu items:
  `auto`. A section's content wrapper: `1fr` + `maxWidth`.
- Never a fit parent (`auto`) with a fill child (`1fr`) on the same axis: Framer silently switches it to fixed and it
  breaks at other widths. If the parent hugs, the child is `auto` or px.
- Limits are `minWidth` / `maxWidth`, not fixed widths. A `minWidth` above the phone width minus side padding scrolls
  the page sideways.
- `height="auto"` with `minHeight` instead of fixed heights; fixed only for icons, avatars, media with `aspectRatio`, and
  the closed variant of something that opens.

## Equal heights

- **Grid:** `gridRowHeightType="auto"` and every cell `width="1fr" height="1fr"`; groups inside the cells
  `height="auto"`; a floor is `minHeight` on the card. Cells are centered in their row by default, so `height="auto"`
  cells end at ragged lines.
- **Row of cards (horizontal stack):** each card `height="1fr"`, the row `height="auto"`.
- **CMS list:** card and item fill the cell; the list itself fits its content.
- Keep the texts of one role about the same length across sibling cards, or truncate them (`textTruncation`).

## Grids

- Responsive columns: `gridColumnCount="auto-fill"` with `gridColumnMinWidth`, instead of a fixed count.
- A grid that becomes a list on a breakpoint: switch to `layout="stack" stackDirection="vertical"`, children
  `width="1fr" height="auto"`.
- Give a grid a card count that fills its rows (6 on 3, 4 on 2 or 4); a single orphan card in the last row looks
  unfinished. Bento grids with rows of different heights are separate grids in a vertical stack.

## Containers and widths

- **One content width** for the header, every section and the footer: the same `maxWidth` and the same side padding.
  The logo's left edge lines up with the headings and the footer.
- Two patterns that work: wide (`maxWidth` 1360–1600, side padding 40–64) or classic (`maxWidth` 1200, side padding
  that leaves about 120px at 1440). A header spanning the window over a 1120 container is the broken combination.
- Structure: Section (full width, vertical padding, background) > Container (`1fr`, `maxWidth`, side padding) > content.
  A narrow text column sits inside the container, aligned to its left edge, not as a new centered field.

## Spacing

- Group by distance: a title is closer to its text than the text is to the buttons; cards of a group are closer to each
  other than to the next group. Use nested stacks with different `gap` (12–24 inside a group, 32–48 between groups) —
  one `gap` for heading, text and buttons erases the grouping.
- Every visible container (fill or border) with text has horizontal padding (cards 24–40px). Text never touches a
  visible edge. Inner spacing is never larger than outer.
- Only values from the scale; at most about eight different gaps on a page.

## Section rhythm

- One vertical section padding on desktop (96–128px), plus at most one larger value for the hero and the closing
  section. Tablet ×0.75–1, phone ×0.5. Two sections with the same background do not double their padding.

## Breakpoints

- Desktop 1440 (primary), Laptop 1280, Tablet 810, Phone 390 (`breakpoints_add`); every replica has a `width`. A
  replica copies the primary: layers are added and deleted there, and each breakpoint overrides its copies by compound
  id. With one content width (`maxWidth` 1200) Laptop needs no overrides.
- On phone: display sizes ×0.4–0.67, side padding 16–24 (20 is common), rows of 3+ become columns, navigation becomes
  a menu, button labels stay on one line, tap targets at least 44px.
- Hero: `height="auto"` + `minHeight="100vh"` when it needs the screen, never a fixed `100vh`.
- Text style sizes per breakpoint: read `text_styles_list` before trusting them. A style can keep a slot from older
  breakpoints (one starting at 1200), and its tablet sizes can end up smaller than its phone sizes. Tablet sits between
  laptop and phone (display 96 / 72 / 40 for 1280 / tablet / phone). After styles change through the Plugin API, run
  `framer_connect { reconnect: true }` before the next DSL batch.
- A page that uses a layout template takes its breakpoints' fill from the template: set it on the template's
  breakpoints.
- No horizontal scroll: no px widths above the replica width minus padding, no absolute layers outside the frame.

## Cards made of two pieces

- A card of a text panel and a photo side by side is one solid card: the component's root gets the card fill
  (`Surface/Card`), the radius and `overflow="clip"`, `padding="0px"` and `gap="0px"`; the photo runs to the edges
  with no radius of its own, the root clips the corners. A transparent gap between the pieces shows whatever is behind
  them: the card under it in a sticky stack, the next slide in a slider.

## Layers stretched over their parent

- A frame stretches by its pins alone: `position="absolute"` with `left`, `right`, `top`, `bottom` at `0px`.
- **A component instance does not:** it keeps its own `width` and `height`, which default to `auto`, so a pinned
  instance collapses to its content (seen: a full-bleed video layer at 200 x 200). Give it `width="100%"
  height="100%"` together with the pins. `layout_audit` reports it as `pinned-instance-auto`.

## Overflow, sticky, z-index

- `overflow="clip"`, never `hidden`: hidden breaks sticky anywhere inside it. A clip container cuts shadows and hover
  scale of its children unless it has padding for them.
- A sticky header is a direct child of the breakpoint (or the layout template) at `index="0"`, with its own fill and
  `zIndex="5"`; a sticky layer only sticks within its parent. Sections carry no `zIndex`.

## Images

- An image frame needs a size: `width="1fr"` + `aspectRatio` + any px height, or a fixed height. A frame with an image
  fill, no children and `height="auto"` collapses to 0.
- One ratio system per page (e.g. 4:5 portraits, 16:9 wide); images in a row share one ratio. A circle is `width` +
  `aspectRatio="1"`.
- Files at least twice the shown width; `altText` on every meaningful image.

## Buttons

- Symmetric padding (horizontal 16–24, vertical 10–16); height 40–44 for rectangles, 48–60 for pills; the label style
  with line height 1.0–1.2 so the text sits in the middle.
- `width="auto"` on desktop; full width only on phone or in a form.
- One button shape per site; a pill's radius is half its height.
- The link goes on the button frame, not on its text. A button or tab that is a component gets a Link property bound
  to its root, never a frame wrapped around the instance (`motion`, Links on components).

## Mixed sizes in a row

- Stacks have no baseline alignment. A price with a small unit: `stackAlignment="end"` with matching px line heights,
  or nudge the small text with padding. Value + unit always sit in a stack, never in a frame without layout.
