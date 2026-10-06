# Sitewright

An MCP server and CLI that let AI agents (Claude Code, Cursor, Codex) build and edit [Framer](https://www.framer.com)
sites: color tokens, text styles, pages, sections, components, images and icons. Every change goes into a local
journal you can undo.

> Unofficial. Not affiliated with or endorsed by Framer. "Framer" is a trademark of Framer B.V.

## Quick start

Requires Node.js 24.11 or newer. Run the setup in a terminal:

```bash
npx -y sitewright@latest
```

It asks where to connect Sitewright (Claude Code, Cursor, Codex or another MCP client), offers to add your projects'
Server API keys, what the agent may do, and the Claude Code hooks for skills in the journal.

Then open your project in Framer, run the **Sitewright** plugin and click **Connect**. A small window opens: keep it
open while your agent works. It is also the journal of everything the agent did.

`npx sitewright setup --print` prints the commands and config blocks instead, for scripts and CI.

## Two ways to reach Framer

| | What you need | What works |
| --- | --- | --- |
| **Plugin** (default) | The Sitewright plugin open in the Framer editor, and its window | Color tokens, text styles, fonts, editor selection, SVG, component controls, code files, and pages built from frames and text (layout, size, fill, radius, border, links, text styles); changes land live in the editor |
| **Server API key** | Your own key: Framer → Site Settings → General → API Keys | Everything above, plus the rest of Framer's layout language (effects, transitions, variants, components, rich text, shadows, image fills), screenshots, the DSL reference, icon, component and photo catalogs |

Each Framer project has its own Server API key. Add as many as you work on; they are saved in `~/.sitewright/keys.json`
(readable by you only), and Sitewright uses the key of the project the plugin is open in:

```bash
npx sitewright key          # add a project's key: the project the plugin is open in, or a pasted project link
npx sitewright key list     # the projects with keys
npx sitewright key remove   # forget one
```

Everything runs through the connected plugin: the project is always the one the plugin is open in, and nothing runs
while it is not connected. To work without the editor, choose the Server API on purpose
(`SITEWRIGHT_TRANSPORT=server-api`) and tell your agent the project ("now the Vela site"): `framer_status` lists the
projects with a saved key and `framer_connect` switches to one by name.

The journal page has the same form (Settings → Server API key).

With a key and the plugin, calls go to the plugin first and the layout work goes to the Server API of the same project.

## The journal

`sitewright open` (or the plugin's **Open journal**) shows a local page at `http://127.0.0.1:18710/`:

- every call Claude made, newest first, and how it reached Framer: **Plugin API**, **Server API** or **Framer
  agent** (the DSL);
- **Undo** and **Redo**, checkpoints, and **Restore** to a checkpoint with a preview first;
- the **skills** Claude used for a change (see below);
- the **settings**: plugin first, custom code, code components (both off until you turn them on), support reminders.

Claude hears about what you undid there, so it re-reads before building on it.

## Skills in the journal

Claude Code loads skills itself, so Sitewright learns about them through Claude Code hooks:

```bash
npx -y sitewright@latest setup --hooks          # print the hooks to add
npx -y sitewright@latest setup --hooks --yes    # add them to ~/.claude/settings.json (a .bak copy is kept)
```

Restart Claude Code afterwards. The hooks run in the background and note only skill activations and reads of a
skill's files, for the conversation that uses Sitewright.

## Commands

```text
sitewright                    in a terminal: the setup wizard; for MCP clients: the MCP server on stdio
sitewright setup              the setup wizard (setup --print: the commands and config blocks instead)
sitewright setup --hooks      show the Claude Code hooks for skills in the journal (--yes adds them)
sitewright setup --skill      add the Sitewright skill to Claude Code
sitewright key                add a project's Server API key (key list, key remove)
sitewright settings           what the agent may do (settings --print, settings customCode=on)
sitewright open               open the journal page of the running server
sitewright logs               follow the logs of every running server on this machine
sitewright --version
sitewright --help
```

## Tools

- **Design system:** `color_tokens_list`, `color_tokens_upsert`, `color_tokens_delete`, `text_styles_list`,
  `text_styles_upsert`, `text_styles_delete`, `fonts_search`, `fonts_discover` (Google Fonts and Fontshare beyond
  Framer's library, with licenses and the files to upload), `link_styles_list`, `link_styles_upsert`,
  `link_styles_delete` (text links without Framer's default blue, with hover and the current page), `styles_usage`
  (where each token and style is used, and what nothing uses).
- **Pages and nodes:** `project_overview`, `nodes_read`, `design_apply`, `layout_audit`, `selection_get`,
  `node_screenshot`, `breakpoints_add`, `framer_docs`.
- **Motion:** `effects_set` — appear sequences, text reveals, hover and press, loops, scroll growth, parallax and
  tickers in one call, with every value written and springs without bounce of the kind Framer keeps.
- **Checks before handover:** `seo_audit` (titles, descriptions, one h1, noindex, social image, favicon),
  `links_check` (missing pages, anchors without a target, broken mailto and tel), `images_check` (the same photo twice,
  missing alt text), `a11y_audit` (text that does not stand out from its background, links without text),
  `contrast_check` (a color or token pair against WCAG), `template_audit` (a Marketplace template against Framer's
  checklist, section by section), `live_check` (the published site as visitors get it: values published as
  references, broken images and links, missing meta tags, heavy pages).
- **Design guide:** `design_guide` — what Framer's DSL does without saying so, layout and motion rules, Marketplace
  templates, and the checklist before handing a page over. The Claude Code skill (`setup --skill`) points the agent at it.
- **Components and assets:** `components_read`, `component_controls_set`, `component_insert` (a free Marketplace
  component or one of Framer's own, by module URL), `component_make_local` (a Marketplace component copied into the
  project to restyle), `component_detach` (an instance as plain layers), `icons_search`, `images_search`, `image_upload`, `file_upload`
  (videos, PDFs, fonts), `svg_add`.
- **Marketplace:** `marketplace_browse` — templates and components in their current ranking, by category or name, to
  offer a component instead of building one. `marketplace_item` —
  the items behind links you or the agent found: description, author, price, preview and last update, and for a free
  component its controls, read from a copy placed on a temporary design page, to judge whether it fits.
- **CMS:** `cms_collections_list`, `cms_collection_create`, `cms_collection_delete`, `cms_fields_set`,
  `cms_items_list`, `cms_items_upsert`, `cms_items_delete`, `cms_items_order`. Items are written by slug, values by
  field name. Undo restores items, not yet collections, fields or the order of items.
- **Pages and the whole site:** `page_create`, `page_delete`, `page_duplicate` (a copy with its breakpoints, as a
  draft), `reference_screenshot` (any public page, e.g. a reference the user names), `publish_preview` (what a publish
  would change and what blocks it, without publishing), `nodes_find` (layers by name, text or type across
  pages), `text_replace` (with a dry run; undoable), `redirects_list`, `redirects_set`, `publish_status` (what changed
  since the last publish), `deployments_list`.
- **Localization:** `locales_list`, `locale_add` (a new language, as a draft), `localization_get` (what still needs
  translating), `localization_set`.
- **Code** (off until you allow it): `custom_code_get`, `custom_code_set`, `code_files_list`, `code_file_read`,
  `code_file_write`, `code_file_delete`.
- **Journal:** `activity_list`, `activity_get`, `activity_checkpoint`, `activity_undo`, `activity_redo`,
  `activity_restore`, `activity_open`.
- **Connection and publishing:** `framer_status`, `framer_connect`, `project_publish` (only when you ask).

## Configuration

| Variable | Default | What |
| --- | --- | --- |
| `SITEWRIGHT_TRANSPORT` | `auto` | `auto` (through the plugin, nothing without it), `server-api` or `plugin` |
| `SITEWRIGHT_HOME` | `~/.sitewright` | The journal, project keys, settings, logs and the bridge's port |
| `SITEWRIGHT_BRIDGE_PORT` | `18710` | The local journal page and the plugin's bridge |
| `SITEWRIGHT_HISTORY` | `on` | `off`: no journal, nothing to undo |
| `SITEWRIGHT_SUPPORT_REMINDERS` | `on` | `off`: Claude never mentions how to support the project |
| `LOG_LEVEL` | `info` | Logs go to stderr and to `~/.sitewright/logs/` |

## Privacy

Your key and your project data stay on your machine. The server talks only to Framer and to the plugin on your
computer. No telemetry, no account.

## Support

Sitewright is free. At most once a week, after a change that worked, Claude may mention how to support its
development; turn it off with the switch on the journal page or `SITEWRIGHT_SUPPORT_REMINDERS=off`.

## License

MIT
