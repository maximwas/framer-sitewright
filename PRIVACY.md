# Privacy policy

Effective October 12, 2026. This policy covers Sitewright: the `sitewright` MCP server and CLI (npm), the Sitewright
plugin for Framer, and the journal page they serve on your computer. Sitewright is free, open source (MIT) and
maintained by Maksym Vasianin. It is unofficial and not affiliated with Framer.

## In short

- Sitewright runs on your computer. There is no Sitewright server, account, telemetry, analytics or advertising.
- The maintainer receives none of your data: not your projects, your keys, your prompts or how you use the tools.
- Sitewright talks to Framer, to your computer, and to the public pages a tool is asked to read. Nothing else.
- What a tool returns goes to the AI agent you use, under that agent's own policy (see below).

## What runs where

- **The MCP server** runs on your computer, started by your AI client (Claude Code, Cursor, Codex or another MCP
  client).
- **The plugin** runs inside the Framer editor. It makes no network requests of its own: it only exchanges messages
  with the journal window on your computer.
- **The journal page** is served at `http://127.0.0.1:18710` (or the port you set), on your computer only. Its
  connections accept only that page.

## Data stored on your computer

Everything Sitewright keeps is in `~/.sitewright` (or `SITEWRIGHT_HOME`) and `~/.cache/sitewright`:

| File | What it holds |
| --- | --- |
| `keys.json` | The Framer Server API keys you add, one per project. Readable by your user only. |
| `history/` | The journal of each project: what each call read or changed, with the before and after states that undo needs. A cleared journal moves to `history/archive/`. |
| `settings.json` | Your switches: plugin first, custom code, code components, support reminders. |
| `logs/` | What the server did. API keys and tokens are redacted. |
| `bridge.json` | The local port and a random token Sitewright's own processes use to reach each other. Readable by your user only. |
| `skill-notes/` | Only if you add the optional Claude Code hooks: which skills Claude used in a conversation, so the journal can show them. Each file is removed when its server process ends. |
| `support.json` | When the support note was last shown. |
| `~/.cache/sitewright` | A copy of Framer's public DSL reference, so it is not downloaded on every start. |

## Network connections

Sitewright connects only to:

- **Framer**, to read and change the project you work on: through the plugin in your editor and, if you add a key,
  through Framer's Server API for that project. Your project data stays in Framer, under Framer's policies.
- **Public pages a tool is asked to read:** Marketplace items you link (framer.com), a reference page you ask to
  screenshot (captured by Framer's browser), a reference image you give `image_compare` by URL, and your own
  published site with the links and images on it (`live_check`). A reference image given as a file is read on your
  computer and goes nowhere.
- **Your computer** (`127.0.0.1`), for the journal page.

## Your AI agent

Sitewright's tools answer your AI agent: page structure, text, styles, CMS items, screenshots and the like. The agent
sends them to its model provider (for example Anthropic, OpenAI or Cursor) under that provider's terms and privacy
policy. Sitewright does not control what your agent or its provider does with them.

## Support links

At most once a week, after a change that worked, a tool result may carry one sentence with links to donate (Ko-fi and
a monobank jar). Turn it off with the switch on the journal page or `SITEWRIGHT_SUPPORT_REMINDERS=off`. Sitewright
sends nothing to those sites; if you open them, their own policies apply. Installing from npm or GitHub falls under
their policies as well.

## Deleting your data

- Remove a project's key with `sitewright key remove`, or delete `~/.sitewright` and `~/.cache/sitewright` to remove
  everything Sitewright stored.
- Remove the MCP server from your AI client and the plugin from Framer. Changes already made in your Framer project
  stay there until you change them.

## Changes and contact

Changes to this policy are made in this file, and its history shows every version. Questions: open an issue at
https://github.com/maximwas/framer-sitewright/issues.
