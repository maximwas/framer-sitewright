# Verify before saying a page is done

## Automatic

- `design_apply` returns `audit` for what each batch touched; `layout_audit` checks a whole page with its breakpoints.
  Fix every `defect`, then the `likely` findings; weigh `taste` findings against the agreed direction and tell the user
  which ones you kept on purpose.
- Read back what Framer may rewrite (fonts it swapped, text styles dropped on breakpoint copies).

## With your eyes

- With a Server API key: `node_screenshot` of every breakpoint and of each changed section (canvas screenshots never
  run effects).
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

Images
- No collapsed or squashed frames; one ratio per row; one art direction; alt text; files at least twice the shown size.

Interaction
- A hover on everything clickable, never two at once; things that open animate their height; the sticky header stays,
  has a fill, and lies above everything.

Responsive
- 1440, 1200, 810, 390, and slowly dragged between them; no horizontal scroll at 390 or 320; rows of three become a
  column; display ×0.4–0.67 on phone; side padding 16–24; button labels on one line; tap targets 44px.
