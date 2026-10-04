# Sitewright

An MCP server that lets AI agents (Claude Code, Cursor, Codex) build and edit [Framer](https://www.framer.com) sites:
design tokens and text styles, pages, sections and components, images and icons. Every change goes into a local
journal you can undo.

> Unofficial. Not affiliated with or endorsed by Framer. "Framer" is a trademark of Framer B.V.

## Quick start

Requires Node.js 24.11 or newer. Run the setup in a terminal:

```bash
npx -y sitewright@latest
```

It connects Claude Code, Cursor or Codex, offers to add your projects' Server API keys (one per project, kept on your
computer), what the agent may do, and the skill hooks. Then open your project in Framer → Plugins → Sitewright →
**Connect**. `npx sitewright setup --print` prints the commands and config blocks instead, for scripts and CI.

## Two ways to reach Framer

| | What you need | What works |
| --- | --- | --- |
| **Plugin** | The companion plugin open in the Framer editor (Marketplace release coming; for now `pnpm dev:plugin`). Its **Connect** button opens the journal window, which carries the plugin's connection: keep it open | Color tokens, text styles, fonts, selection, SVG, component controls, code files, and pages built from frames and text (layout, size, fill, radius, border, links, text styles) |
| **Server API** | Your own key: Framer → Site Settings → General → API Keys | Everything above, plus the rest of Framer's agent DSL (effects, transitions, variants, components, rich text, shadows, image fills), screenshots, the DSL reference, icon, component and photo catalogs |

Each project has its own key. `npx sitewright key` (or Settings on the journal page) saves one per project in
`~/.sitewright/keys.json`, and Sitewright uses the key of the project the plugin is open in, or the one you name to your agent ("now the Vela site"). For one fixed project,
e.g. in CI, `FRAMER_API_KEY` and `FRAMER_PROJECT_URL` in the server's environment work too.

When both are available, calls go to the plugin first and the DSL work goes to the Server API of the same project.

## What it does

- **Design system:** color tokens with light and dark values, text styles with breakpoint sizes, font search.
- **Pages:** read a page or a node as XML, change it with XML or raw DSL and get Framer's diagnostics back.
- **Layout audit:** after every change and on request, checks for what looks broken on the published site: children
  lined up on different edges, cards of uneven height, text links in the default link color, sections wider than the
  rest, fixed sizes that break on phones, missing headings, uneven spacing and template habits.
- **Components:** variants, controls, hover and pressed states, interactions.
- **Assets:** stock photos, uploads, SVG, icon sets.
- **Journal with undo:** every call is recorded; undo the last change, a change and everything after it, or restore
  to a checkpoint. A local page (`sitewright open`) shows the journal, how each call reached Framer (Plugin API,
  Server API or Framer's agent layer), the skills Claude used, the settings (custom code, code components) and the project's Server API key.
- **Knowledge:** `design_guide` and the Claude Code skill: the order of work, layout and typography rules, direction
  measured on top Framer sites, the habits of generated pages to avoid, and the checklist before handing a page over.

## Privacy

Your Framer key and your project data stay on your machine. The server talks only to Framer. There is no telemetry and
no account.

## Skills in the journal

Claude Code loads skills itself, so the server learns about them through Claude Code hooks. To see in the journal
which skills Claude used for a change:

```bash
npx -y sitewright@latest setup --hooks --yes   # adds two background hooks to ~/.claude/settings.json
```

Restart Claude Code afterwards. Without `--yes` it only prints the block to add yourself. The hooks run in the
background and record only skill activations and reads of a skill's files.

## The `framer-craft` skill

[`skills/framer-craft`](skills/framer-craft/SKILL.md) is a Claude Code skill with the same field-tested rules, for any
agent working on Framer, including Framer's own agent. To use it, link the folder into `~/.claude/skills`:

```bash
ln -s "$(pwd)/skills/framer-craft" ~/.claude/skills/framer-craft
```

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

## Development

```bash
pnpm install && pnpm build
pnpm lint && pnpm typecheck && pnpm test
pnpm check:pack          # pack like npm publish, install into an empty folder, run it there
pnpm local:link          # the sitewright command from this clone, in any folder (pnpm local:unlink removes it)
pnpm dev:plugin          # the companion plugin; in Framer: Plugins → Open Development Plugin
```

| Path | Package | What |
| --- | --- | --- |
| `apps/server` | `sitewright` | The MCP server and CLI: tools, the plugin bridge, the undo journal, logs |
| `apps/plugin` | `@sitewright/plugin` | The Framer plugin: runs operations in the editor, shows the setup steps |
| `apps/web` | `@sitewright/web` | The local page with the journal and settings, and the window that carries the plugin's connection; shipped inside the server package |
| `packages/core` | `@sitewright/core` | Framer operations, the bridge protocol, undo; no Node and no Framer SDK |
| `packages/ui` | `@sitewright/ui` | The journal panel (React) of the local page, and the theme the plugin shares |

## Support

Sitewright is free and open source. Support links (Patreon, monobank) are coming soon. At most once a week, after a
change that worked, Claude may mention them; turn that off with the switch on the journal page or
`SITEWRIGHT_SUPPORT_REMINDERS=off`.

## License

[MIT](LICENSE)
