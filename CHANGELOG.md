# Changelog

Every release of Sitewright, newest first: the version, the day it was released, and what changed for the people who
use it. The npm package `sitewright` and the Framer plugin share one version.

<!--
How to write this file (people and agents alike):

- One section per released version, newest first: `## <version> — <YYYY-MM-DD>`, the date the tag was pushed. The
  release workflow refuses a tag without its section here, and the section becomes the GitHub release's notes.
- Changes waiting for a release go under `## Unreleased` at the top. At release time rename it to the version and date.
  The website leaves Unreleased out.
- Inside a section, the groups that apply, in this order: `### Added`, `### Changed`, `### Fixed`, `### Removed`.
- One bullet per change, as the user meets it: what they can do now or what works now. Present tense, plain English,
  tool names in backticks (`design_apply`). No file paths, commit hashes or internal names.
- After editing, run `pnpm docs:changelog` to rewrite the website's page (docs/changelog/index.html).
-->

## Unreleased

### Added

- `images_upload` uploads up to 20 local images in one call and returns each path with its url; a file that fails is
  listed with why, and the others still upload.

### Changed

- `image_upload` and `file_upload` take a path relative to the project folder too, not only an absolute one.
- `svg_add` takes an .svg file by path, sets the layer's width with `width` (the height follows the viewBox), and with
  `keepViewBox` keeps the empty space around the drawing, which Framer otherwise crops away.

- `framer_guide` says how to show a whole image or a tiled one, which the API cannot set on an image fill, and that a
  text node takes letter spacing in em, as Figma gives it.

### Fixed

- `design_apply` no longer warns about a letter spacing in fractional px, such as -0.36px.
- Tools that read a page through the Server API find a CMS detail page by the path `project_overview` shows
  (`/blog/:slug`): `seo_audit`, `links_check`, `images_check`, `a11y_audit`, `rich_text_audit`, `styles_usage` and the
  site-wide runs no longer stop at "Page not found".
- A site-wide `seo_audit`, `links_check`, `images_check`, `a11y_audit`, `rich_text_audit` or `template_audit` goes on
  past a page Framer cannot read and names it in its summary, instead of stopping at it.
- `styles_usage` for one page counts the styles inside the components placed on it, and inside the components those
  place, so a style used only there no longer shows as unused.
- `site_audit` starts its summary with the checks that failed and the pages they could not read, and lists the rules
  each check hit, so its layout roll-up names the same rules `layout_audit` does.
- `nodes_query` finds text by `fontName`, `fontWeight` and `fontStyle` (a styled text by its style's font), and refuses
  an attribute it cannot read, such as `textColor`, naming the tool that reads it, instead of finding nothing.
- `nodes_read` without `pagePath` reads a node on the page it is on and names that page, instead of answering "/", and
  gives `$rect` on every page, not only the home page.

## 1.1.3 — 2026-10-22

### Added

- A changelog: this file and its page on the website, with every release, its date and what changed.
- GitHub Discussions for questions, ideas and showing what you built, linked from the issue chooser, the READMEs and
  the website.

### Changed

- The plugin window resizes only in width by hand; its height follows its content.

### Fixed

- The plugin window shrinks to its bar when you fold it and grows back when you unfold it, instead of keeping its
  height with empty space below.
- `design_apply` reads a text run of only a no-break or an em space as it is written, without an added space, so the
  XML `nodes_read` gives sent back unchanged changes nothing.
- `design_apply` writes a plain space typed between two text runs as one space, not two.
- `sitewright logs` shows the lines running servers write while it follows (on macOS it showed only those from
  before it started), and works before any server has written its log.

## 1.1.2 — 2026-10-13

### Added

- GitHub issue forms for a bug report, an idea and feedback.
- The plugin and the journal page say where to report a bug or an idea, under the donation links. The READMEs, the npm
  page, the website, the docs and the privacy page link to the forms too.

## 1.1.1 — 2026-10-13

### Added

- The plugin window folds to its bar and opens again with the chevron in its bar, and opens the way you left it.

## 1.1.0 — 2026-10-12

### Added

- `nodes_lock` locks and unlocks layers, with or without a Server API key. Undo unlocks only what it locked, and
  `nodes_query` finds locked layers.
- `component_border_variable_add` adds a border control to a component, which `design_apply` cannot create.
- `image_compare` captures a node and compares its lines and edges with a reference PNG, such as a Figma export, row by
  row and column by column.
- `design_apply` reads back the layers it set and warns when Framer kept a value as it was, when a variant's override
  equals what it inherits (Framer drops it), and about variant changes that jump on the site.
- The plugin asks you to update the MCP server, with the command, when the server is older than the plugin.
- `framer_guide` covers resets to the default, variant overrides, motion pitfalls and moving a Figma design.

### Changed

- `design_apply` refuses a batch that names a color token the project lacks, before anything is written, and names the
  token you most likely meant.
- `design_apply` writes border controls per side and resets `zIndex` through the plugin, where the DSL refuses them.
- `component_controls_set` takes a control by its name and a border as `"0 0 1px 1px solid <color>"`.
- `nodes_read` shows the sides of an instance's border.
- Framer lint messages known to misfire are marked low confidence, with the reason.
- A read that finds no layer on an old Server API session reconnects and reads once more.

### Fixed

- A token created and used in the same `design_apply` batch is bound correctly.
- `component_controls_set` no longer reports a border it wrote as not stored.
- The layout audit reads a text's paragraph alignment, and the accessibility audit sees background layers.

## 1.0.11 — 2026-10-12

### Fixed

- A CMS Collection List created in one `design_apply` batch binds its item's fields. Framer used to refuse them as not
  in scope.

## 1.0.10 — 2026-10-12

### Fixed

- `layout_audit` no longer reports instances stretched by their pins (a grain, a grid, a background video) as
  collapsed.
- `component_controls_set` writes only the controls you name, so the others keep their token bindings, and it
  recognizes fonts Framer stores by family.

## 1.0.9 — 2026-10-12

### Changed

- The plugin window is compact and follows its content: once connected, it shows the status, one button and the
  support line.
- The journal names items by their text, not by a token value.

## 1.0.8 — 2026-10-12

### Changed

- Donations go to Ko-fi and a monobank jar instead of Patreon.

## 1.0.7 — 2026-10-08

### Fixed

- The plugin removes its listeners when it closes. This is the first version approved on the Framer Marketplace.

## 1.0.6 — 2026-10-08

### Changed

- The plugin ships every source module as its own readable file, for Framer's Marketplace review.

## 1.0.5 — 2026-10-08

### Changed

- The plugin contains only the operations it runs, readable and without network code, for Framer's Marketplace review.

## 1.0.4 — 2026-10-08

### Changed

- Sitewright gives no design advice: `design_guide` became `framer_guide`, a guide to how Framer behaves.

## 1.0.3 — 2026-10-08

### Fixed

- Connect works in the plugin installed from the Framer Marketplace.

## 1.0.2 — 2026-10-08

### Changed

- A new mark in the plugin's icon, the journal, the website and the docs.

## 1.0.1 — 2026-10-08

### Changed

- The npm page links the website as the homepage.

## 1.0.0 — 2026-10-08

### Added

- The first public release: the `sitewright` MCP server and CLI on npm, the Sitewright plugin for Framer, and the local
  journal that records every change and undoes it.
