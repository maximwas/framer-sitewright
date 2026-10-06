# Verify

## Screenshots

- **Each breakpoint and each changed section:** `framer.screenshot(nodeId, { scale, clip, format })`.
- **Size:** keep images under 2000px a side; use `clip` or `scale: 0.5`.
- **A `ComponentNode` cannot be screenshotted** ("exportable ground node"). Screenshot its variants.
- **Things screenshots cannot show:**
  - the canvas and screenshots never run effects (appear, hover, loop, ticker, scroll);
  - they draw `backdrop-filter` wrongly;
  - an IconNode's size can differ on the site.

  Check those on the published or preview site in a browser.
- **Stale lint:** "Visible siblings… spacing -1340" right after big replica overrides comes from stale sizes. Trust the
  screenshots.

## Diagnostics

- **`errors`:** Framer applied every command without an error and skipped only the failed ones. Send only the failed
  commands again, fixed, with the real ids from `renamedIds` for nodes the batch created. Re-sending the whole batch
  creates its nodes twice.
- **`warnings` and `linter`:** clipping, overflow, mid-word wraps, dark-mode contrast.
- **Quotes:** an unclosed quote is auto-repaired with a warning. Fix your string anyway.
- **Escaping:** inside a value escape only `"` as `\"`. Backslashes are not unescaped, and a value ending in `\` eats
  its closing quote.
- **Unknown id:** "Cannot complete SET: The target does not exist" means the id is stale. Read the tree again.

## Values Framer rewrites or drops without an error

Read these back after writing:

- **Springs** in variant transitions and appear effects (see [motion.md](motion.md)).
- **`text` on a variant or breakpoint copy** drops the text style.
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
