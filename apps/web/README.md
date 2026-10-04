# @sitewright/web

The local page Sitewright serves at `http://127.0.0.1:18710/` (shipped inside the npm package as `dist/web`). It is:

1. **The journal**: what Claude did, how each call reached Framer (Plugin API, Server API, Framer agent), the skills
   it used, Undo / Redo, checkpoints, Restore, and the settings.
2. **The plugin's bridge.** The Framer plugin opens this page with **Connect**. The page holds the plugin's session
   with the server (`/sitewright/v1`): the bridge protocol, a serial request queue with deadlines, size limits and
   reconnects. It asks the plugin to run operations through `postMessage` (`run` → `result` / `failure`).

```text
Claude Code ──stdio──► sitewright ──http/ws──► this page ──postMessage──► Framer plugin
                                    /api/ws (journal)    (plugin session)
                                    /sitewright/v1 (plugin)
```

## Security

- The server listens on `127.0.0.1` only and checks `Host` on every request and upgrade (DNS rebinding).
- Both sockets accept only this page's own Origin; the page hears only the allowed plugin origins
  (`GET /api/bridge`) and answers to their exact origin.
- Only `GET`; nothing happens through a URL. Strict CSP, no `Cross-Origin-Opener-Policy` (it would cut the link to
  the plugin).

## Layout

```text
src/
  main.tsx                 journal socket, plugin bridge, render
  bridge/                  PluginBridge, BridgeClient, RequestQueue, startPluginBridge
  api/web-socket-client.ts the journal panel's socket
  components/  host/  store/  constants/  types/  utils/
test/plugin-bridge.test.ts
```

The journal panel itself is `@sitewright/ui`.

## Development

```bash
pnpm --filter @sitewright/web build      # dist/, which the server serves and copies into its package
pnpm vitest run --project web
```
