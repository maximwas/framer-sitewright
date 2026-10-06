# Design system

Create tokens, styles and variables with `framer.agent.applyChanges`. The `framer` skill warns that values created
through plugin API methods can misbehave in later DSL calls. The exceptions below (fonts the DSL refuses, ghost
cleanup) are the only places to step outside the DSL.

## Color tokens

- **Create:**
  `+ColorStyleTokenNode brandBlue name="Brand/Blue" light="rgb(0, 153, 255)" dark="rgb(51, 173, 255)";`
  - A temp id works in the same batch: `var(--token-brandBlue)`.
  - `renamedIds` in the result gives the real ids.
- **Folders:** `/` in the name makes a folder. Group tokens by role: `Brand/…`, `Text/…`, `Surface/…`, `Line/…`.
- **Rename or move into a folder** without breaking references: `SET <token id> name="Brand/Light"`. The id stays.
- **Compare colors after normalizing them.** Framer returns colors as `rgb()` or `rgba()`.
- **Reference a token** as `var(--token-<id>)` in fills, `textColor`, borders and gradients.
- **A token id that does not exist is accepted:** `var(--token-<wrong id>)` is stored as written, with no error, and
  shows no color. Take ids from `renamedIds` or the project's tokens; never type them.
- **A surface that keeps its color in both themes** (a paper ticket, a label, a receipt, a brand-colored band) needs
  text tokens that also keep theirs: give its ink the same light and dark value. A shared ink token turns light on it
  in the dark theme (seen; Framer's linter flags the contrast).
- **Dark values apply only through the visitor's system theme** (`prefers-color-scheme`): Framer has no theme switch
  and no action that changes the theme. A switch needs a code override that writes the tokens' values on
  `document.body` (code, so only when the user asks, and every new token must be added to it). Screenshots show the
  light theme only: check dark on the published site with the system set to dark.

## Text styles

- **Names by role and level:** `Heading 1`, `Heading 1b` (a variant of the same level), `Body`, `Body Small`, `Label`,
  `Caption`. Keep names flat unless the user wants folders.
- **Create:**
  `+TextStylePresetNode h1 name="Heading 1" tag="h1" fontName="…" fontWeight="600" breakpoint.default.fontSize="64px" breakpoint.default.lineHeight="110%";`
- **Units:** `lineHeight` accepts `%` even though the reference lists only px and em. `rem` works in slots.
- **`paragraphSpacing` defaults to 20px.** Text of several blocks (stacked lines, a column of digits) gets 20px between
  them. Write `paragraphSpacing` on purpose: 0 where blocks sit line on line.
- **Color:** the style can carry a color, but text nodes still get their own `textColor` token (see SKILL.md).

### Breakpoint slots

- **Slots are labels, not widths:** `breakpoint.default`, then `medium`, `small`, `extraSmall`, filled in that order.
  `small` without `medium` is refused.
- **Slots map onto the page's breakpoints from the top, and the narrowest slot always starts at 0.** On a site with
  1440 / 1280 / 810 / 390:

  | Slots | Where each slot starts |
  | --- | --- |
  | `medium` | default 1440, `medium` 0 |
  | `medium`, `small` | default 1440, `medium` 1280, `small` 0 |
  | `medium`, `small`, `extraSmall` | default 1440, `medium` 1280, `small` 810, `extraSmall` 0 |

  A `minWidth` on the last slot is ignored. `breakpoint.default.minWidth` cannot be set: the first replica defines it.
- **The plugin API stores the same style shifted by one.** `TextStyle.minWidth` is 0, and `breakpoints` is
  `[1440 → medium values, 1280 → small values, 810 → extraSmall values]`: each entry holds the values used below the
  width where the wider slot starts, contrary to the JSDoc. Write slots through the DSL. If you must use the plugin API,
  mirror this layout.

## Fonts

- **Check that a font exists before using it:** the project inventory lists the project's fonts, and the reference's
  `font-search` query finds library fonts. If Framer has no such font, tell the user where to get it; they upload it.
- **Check the script and the signs before the look.** Framer draws a missing glyph in another face without a warning
  (seen: ₴ in Sofia Sans, which has full Cyrillic, came out wider and bolder). Check every letter the site's languages
  use (Ukrainian ґ є і ї) and every sign the copy uses (₴, №, °, ±, →) in the specimen, then on a screenshot of real
  copy. Write prices with a code (UAH, EUR) when the face lacks the sign. Satoshi, General Sans, Switzer and Instrument
  Sans have no Cyrillic, nor does any of Fontshare's closed-source families; about 294 of 1,950 Google families do.
- **`font-search` by `query` spends the workspace's AI credits.** Without them it fails with "workspace AI credit
  balance exhausted". Search by `name` (`{ type: "font-search", name: "Geist" }`) still works.
- **The DSL sometimes refuses a library family that font search lists** ("No available font variant"; seen with Inter
  Tight). Set it through the plugin API:

  ```js
  const style = (await framer.getTextStyles()).find((s) => s.path === "/Heading 1");
  const font = await framer.getFont("Inter Tight", { weight: 600 });
  await style.setAttributes({ font });
  ```

- **Fonts uploaded to the project work through the DSL** (`fontName`). A weight the project lacks is swapped silently
  (Sofia Pro 300 became 400). Read the style back and tell the user which weight file to upload.
- **Fonts that sit high** (Sofia Pro capitals):
  - in a button, put the label in a wrapper with `padding-top` of about 4px, and keep the button's own padding
    symmetric;
  - an icon next to capitals gets a wrapper with `padding-bottom` of about 4px.

## Folders and deleting

- **Folders have no API.** A folder is the name prefix before `/`, and it disappears with its last item. To delete a
  folder, delete every token or style whose name starts with that prefix.
- **Several styles can share one path** (duplicates). Delete all of them.
- **Deleting a style that text still uses fails.** Reassign the text first. Check that a deletion happened; never
  assume it.
- **Ghost slots (a Framer bug).** A DSL `DEL` of a text style leaves its breakpoint slot nodes behind:
  `TextStylePresetNode`s with `$originalId` equal to the deleted style's id, named after the last segment of its path.
  After the delete, list them and `DEL` them too:

  ```js
  const nodes = await framer.agent.getNodesOfTypes({ types: ["TextStylePresetNode"] });
  const ghosts = nodes.filter((n) => n.$originalId === deletedStyleId).map((n) => `DEL ${n.id};`);
  ```

- **Plugin API `remove()`** on a style with breakpoints leaves a ghost in the DSL view. Call
  `setAttributes({ breakpoints: [] })` first, then `remove()`.
- **Plugin API style names:** `name` is the full path. `setAttributes({ name: "Renamed" })` moves the style to the
  root, so pass the whole path. Never set `name` and `path` together.
