# Verify

## Screenshots

- **Each breakpoint and each changed section:** `framer.screenshot(nodeId, { scale, clip, format })`.
- **Size:** keep images under 2000px a side; use `clip` or `scale: 0.5`.
- **A `ComponentNode` cannot be screenshotted** ("exportable ground node"). Screenshot its variants.
- **Overlay content** (a modal, menu, tooltip or banner) cannot be screenshotted: "SCREENSHOT_PREPARE_FAILED: Target
  node … not found in popup DOM". For a `FixedOverlayNode`, `DUPE` its child with `parent="<breakpoint id>"`,
  screenshot the copy, then `DEL` it. A duplicated `RelativeOverlayNode` stays an overlay, so check it in Preview.
- **Things screenshots cannot show:**
  - the canvas and screenshots never run effects (appear, hover, loop, ticker, scroll);
  - they draw `backdrop-filter` wrongly;
  - an IconNode's size can differ on the site;
  - the dark theme: screenshots show light only ([design-system.md](design-system.md));
  - a non-primary variant that holds a Repeat shows the first item in every row, while the same variant renders
    correctly on an instance: judge Repeat lists on a page instance.

  Check those on the published or preview site in a browser.
- **Stale lint:** right after creating, moving or overriding nodes (big replica overrides, a breakpoint set to
  `height="auto"`, an Open variant with `height="auto"`), Framer's linter judges old sizes: "Visible siblings… too
  close" with negative spacing (even between sections that are not neighbours), "Text sits at the bottom edge of a
  layer that clips overflow" with the breakpoint as `clippedBy`, "Element has zero height" (or zero width) on spacers
  and small icons, and "positioned outside its parent's clipped bounds" on ticker items and fresh children. Trust a
  screenshot over these.

## Diagnostics

- **`errors`:** Framer applied every command it could. A `+` command in `errors` usually still created its node,
  sometimes with none of the command's attributes (a `+RichTextNode` with a refused `paddingBottom` came out without
  its text style). Read the failed targets back and fix them with `SET` on their real ids (`renamedIds`). Sending a
  `+` command again, or the whole batch, makes a second node.
- **`warnings` and `linter`:** clipping, overflow, mid-word wraps, dark-mode contrast.
- **Quotes:** an unclosed quote is auto-repaired with a warning. Fix your string anyway.
- **Escaping:** inside a value escape only `"` as `\"`. Backslashes are not unescaped, and a value ending in `\` eats
  its closing quote.
- **Unknown id:** "Cannot complete SET: The target does not exist" means the id is stale. Read the tree again.

## Values Framer rewrites or drops without an error

Read these back after writing:

- **An attribute or effect field Framer does not know is accepted and ignored**, and the batch still reports
  "applied cleanly": `borderRadius="999px"` left the corners square, because the name is `radius`; seen with effect
  fields too (`appearEffect.direction`, `scrollVariantEffect.variant`, `scrollVariantEffect.transition`,
  `tickerEffect.transition`). Copy attribute names from a read of a similar node or from Framer's reference, never from
  CSS, and read every effect back after writing it.
- **Springs** in variant transitions and appear effects (see [motion.md](motion.md)).
- **A `var(--token-<id>)` of a token that does not exist** is accepted without an error
  ([design-system.md](design-system.md)).
- **`text` on a variant or breakpoint copy** drops the text style.
- **Text bound to a variable, on a variant copy:** the first `SET <variant id><node id> text="…"` stores the variable's
  name ("Title") and still reports success. The same `SET` sent again stores the text. Send it twice (with
  `textStylePreset`), then read the copy back.
- **`textStylePreset` set later** drops the node's `textColor` (SKILL.md).
- **A font weight the project lacks** is swapped for another.
- **`scrollVariantEffect` sections** set on an existing node are ignored.
- **An icon from a project vector set** in an instance's icon control is ignored, and `serialize` does not show
  instance icon controls at all.
- **`textAlignment`** reads `"start"` both when it is unset (taken from the text style) and when it is explicitly
  start. `SET … textAlignment="null"` restores the style's alignment.
- **Hidden in `serialize`:** `appearEffect.replay` and `zIndex="0"` are not shown, but both are active.
- **`undefined` values from `serialize`** must be dropped before writing them back ("Invalid value").

## Session

- **The Server API session sees the project as it was when it connected.** Changes the user made in the editor
  afterwards may be missing: new vector set items, uploaded fonts, manual edits. Start a new session to see them. With
  auto-branching on, a new session may open a new branch.
- **Recycled session or timeout:** a write may or may not have applied. Re-read before retrying, and never blindly
  repeat a create, or the nodes duplicate.
- **Deleted nodes:** their descendants can still be read through `serializeNodes`, under their old parents.
