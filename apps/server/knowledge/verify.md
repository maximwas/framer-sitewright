# Verify before saying a page is done

Whether what was built works and matches what the user asked for. The design is the user's: compare the result with
their design or brief, not with rules of taste.

## Automatic

- `design_apply` returns `audit` for what each batch touched; `layout_audit` checks a whole page with its breakpoints.
  Fix every `defect`, then the `likely` findings. `taste` findings are only suggestions: the user's design decides, so
  mention them to the user instead of changing the page on your own.
- Read back what Framer may rewrite (fonts it swapped, text styles dropped on breakpoint copies).
- Framer's lint in `design_apply` results is stale for the nodes a batch just created, moved or overrode, and after a
  breakpoint or an Open variant gets `height="auto"`. Treat these as noise unless a screenshot confirms them: "Visible
  siblings… too close" with negative spacing (even between sections that are not neighbours), "Text sits at the bottom
  edge of a layer that clips overflow" clipped by the breakpoint, "Element has zero height" (or width) on spacers and
  small icons, and "positioned outside its parent's clipped bounds" on ticker items and fresh children.
- Before handover: `seo_audit`, `links_check`, `images_check`, `a11y_audit` (or `site_audit` for all of them), and
  `live_check` on the published site.

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

## Behaviour in a real browser

A screenshot shows one state of the canvas, where no effect runs; it never proves how something moves or responds.
For every part with a states list (`motion`, States), open the published site (or Preview) in a real browser and go
through every row: first load, each step and the steps already done, the loop back to the start, the interrupted
paths, touch and mouse, reduced motion. A browser MCP such as Playwright, when you have one, can script it (a phone
width with touch, `prefers-reduced-motion`); without one, ask the user to go through the list. Also scroll every page
to its very end at every breakpoint: no layer stays invisible and nothing scrolls sideways.

## Checklist: does it work

Layout
- Every breakpoint the site has, and the widths between them: no horizontal scroll (also at 320), no clipped or
  collapsed layers, no text cut off.

Links and navigation
- Every link used once: no missing pages, every anchor has its target, section links land with their heading below a
  sticky header, `mailto:` and `tel:` links work, a link inside something that opens also closes it.

Interaction
- Every row of every states list passes in a real browser (above).
- Components from the Marketplace or elsewhere keep no defaults the user did not choose (`dsl`, Framer's own
  components and shaders); media a state does not show neither loads nor plays.

Forms and overlays
- Every field inside a `label` frame; the submit button has its Pending, Success, Error and Incomplete variants; the
  user has set where the form sends, and a test went through on the published site.
- Every modal has a close button (`DISMISS_OVERLAY`) with `ariaLabel`: a modal does not close on Escape.

Accessibility and search
- Text passes AA contrast (`contrast_check`) on every fill it sits on, in every state and theme.
- `altText` on meaningful images, one `h1` per page, a title and description on every page (`seo_audit`).
- Every font and image is licensed for this use, and every language's letters render in the chosen faces.

## Handover

Tell the user what is still needed from them (images, copy, fonts), which `taste` findings you left for them to
decide, and what only they can set, with where to click (no tool reaches it): each form's Send To destination (email,
Google Sheets or a webhook, a redirect after submit) and its spam protection; the site's language; connecting a
domain; password protection and staging.
