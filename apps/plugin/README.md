# @sitewright/plugin

The Sitewright plugin for Framer: a thin executor. It runs operations inside the editor with the plugin's own `framer`
object, so Claude can work without a Server API key, and it shows the setup steps.

```text
Claude Code ──stdio──► sitewright ──ws 127.0.0.1:18710──► journal window ──postMessage: run──► this plugin
                                                           (holds the session)  ◄── result ──
```

A published plugin cannot reach `localhost` (Chrome's Local Network Access, Safari's mixed-content rule), so
**Connect** opens the journal window of the local app (`apps/web`). That window holds the plugin's session with the
server; the plugin only answers its `run` messages. The protocol between them is in
`packages/core/src/schemas/relay.ts`.

## How it works

- **Hello.** While the window is open, the plugin says `hello` (version, mode, project) every second; the window
  answers with its `status`. A window that loads late or reloads picks the plugin up by itself.
- **Operations.** `run { id, op, input, journal }` → `runInPlugin` (operations come from `@sitewright/core`, checked
  with `framer.isAllowedTo` first) → `result` or `failure`, with the bridge's error codes.
- **Trust.** Only its own window, at its exact origin, is heard; answers go to that origin.
- **The window's UI** shows the status, one button (Connect, Open journal or Reconnect) and two setup steps to copy:
  the setup wizard (`npx -y sitewright@latest`) and, optionally, this project's Server API key (`npx sitewright key`
  or Settings on the journal page).
- **Project link.** On plans with branches, `hello` carries the editor link of the `main` branch, so the key form
  can fill it in.

## Layout

```text
src/
  main.tsx              the link, the operation runner, editor.reveal, render
  App.tsx               status, button, setup guide
  link/                 WindowLink (the journal window), runInPlugin (operations)
  framer/plugin.ts      everything that touches `framer`: runtime, plugin info, permissions, reveal, clipboard
  components/  constants/  types/  utils/
test/window-link.test.ts
```

## Origins

The journal window hears only the plugin origins in `DEFAULT_PLUGIN_ORIGINS` (`packages/core/src/constants/bridge.ts`):
the development plugin at `https://localhost:5173` and the published one where Framer serves it
(`https://5iqjj58d3q5bu5e29j5lpq0po.plugins.framercdn.com`). Never all of `plugins.framercdn.com`: any other plugin
could then pose as Sitewright. After a Marketplace update, check that **Connect** still connects.

## Release

The `Release` workflow packs the plugin (`framer-plugin-tools pack`) and puts the zip on the GitHub release; it is
uploaded in the Framer Marketplace dashboard by hand (Publish New Version).

Framer's review reads the submitted code, so the build keeps every source module as its own file at its source path
(`apps/plugin/src/…`, `packages/core/src/…`), is not minified and holds no network code. The plugin imports
only `PLUGIN_OPERATIONS` from `@sitewright/core`: the operations that need framer.agent outright (screenshots,
`readProject`, catalogs, the DSL) are not in its bundle, and it answers them with the Server API key error.

## Development

```bash
pnpm dev:plugin                          # https://localhost:5173; in Framer: Plugins → Open Development Plugin
pnpm --filter @sitewright/plugin build
pnpm vitest run --project plugin
```
