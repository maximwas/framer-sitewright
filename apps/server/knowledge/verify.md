# Verify before saying a page is done

## Automatic

- `design_apply` returns `audit` for what each batch touched; `layout_audit` checks a whole page with its breakpoints.
  Fix every `defect`, then the `likely` findings; weigh `taste` findings against the agreed direction and tell the user
  which ones you kept on purpose.
- Read back what Framer may rewrite (fonts it swapped, text styles dropped on breakpoint copies).
- Framer's lint in `design_apply` results is stale for the nodes a batch just created, moved or overrode, and after a
  breakpoint or an Open variant gets `height="auto"`. Treat these as noise unless a screenshot confirms them: "Visible
  siblings… too close" with negative spacing (even between sections that are not neighbours), "Text sits at the bottom
  edge of a layer that clips overflow" clipped by the breakpoint, "Element has zero height" (or width) on spacers and
  small icons, and "positioned outside its parent's clipped bounds" on ticker items and fresh children.

## With your eyes

- With a Server API key: `node_screenshot` of every breakpoint and of each changed section (canvas screenshots never
  run effects).
- Writes that run through the plugin (`component_controls_set`, `component_insert`, `svg_add`, uploads) reach the
  Server API copy, which screenshots, audits and `$rect` read, a minute or two later, even after
  `framer_connect { reconnect: true }`. After such writes, wait before judging a screenshot or an audit, and never
  "fix" what one shows without reading the node first.
- A screenshot of a non-primary variant that holds a Repeat shows the first item in every row, while the same variant
  renders correctly on an instance. Judge Repeat lists on a page instance.
- `node_screenshot` cannot capture what is inside an overlay ("SCREENSHOT_PREPARE_FAILED: … not found in popup DOM").
  For a `FixedOverlayNode`, `DUPE <its child> parent="<breakpoint id>"` with `design_apply` dsl, capture the copy, then
  `DEL` it. A copied `RelativeOverlayNode` stays an overlay: check it in Preview.
- Without a key: ask the user to look at the editor, or publish when they ask and look at the published site.

## Checklist

Alignment
- Every column has one edge; the header logo, section headings and the footer share one left edge.
- Buttons and icons sit on the edge of the text above them; cards in a row share their top, bottom, title line and
  button line.

Spacing and rhythm
- Only scale values; one section padding (two at most); no doubled padding between sections of the same background.
- A title is closer to its text than the text is to the buttons; text never touches a visible edge.

Typography
- No one-word last lines in headings (balance on); body measure 45–75 characters; display tracking negative and line
  height tight; hierarchy readable from three steps away.
- Text links styled (not blue) or moved onto frames.

Consistency
- One button shape, one radius system (nested smaller), one icon set; the same label for the same action; every text
  in a text style; colors only from tokens; one accent.

Concept, words and rights
- A stranger can say in five seconds what the site is about; with a competitor's logo on it, the page no longer fits.
- The idea shows in the first screen, the signature, the vocabulary, the form of the proof and the ending, and stays
  out of navigation, forms, prices and legal text.
- The signature has a phone version and reads with reduced motion; the 404, footer line and cookie banner speak in the
  voice.
- No AI copy tells (`direction`), no unverified claims, no invented reviews on a client's site.
- Every font and image is licensed for this use; every language's letters and the copy's signs render in the chosen
  faces.

Images
- No collapsed or squashed frames; one ratio per row; one art direction; alt text; files at least twice the shown size.

Interaction
- A hover on everything clickable, never two at once; things that open animate their height; the sticky header stays,
  has a fill, and lies above everything.

Forms and overlays
- Every field inside a `label` frame; the submit button has Pending, Success, Error and Incomplete variants; the user
  has set where the form sends, and a test went through on the published site.
- Every modal has a close button (`DISMISS_OVERLAY`) with `ariaLabel`: a modal does not close on Escape.

Responsive
- 1440, 1200, 810, 390, and slowly dragged between them; no horizontal scroll at 390 or 320; rows of three become a
  column; display ×0.4–0.67 on phone; side padding 16–24; button labels on one line; tap targets 44px.
