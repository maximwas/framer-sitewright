# @sitewright/ui

The journal panel (React 18, Tailwind CSS 4, zustand) of the local page (`apps/web`), and the pieces the plugin shares
with it: Framer's theme as Tailwind colors (`theme.css`), `framerCss()` for Vite, `SupportLinks`, small helpers.

The panel shows Claude's calls newest first in four views (All, Changes with the skills used for them, Reads,
Skills), each call's layer badge (Plugin API, Server API, Framer agent), Undo / Redo, checkpoints and Restore with a
preview, the plan banner and the settings. Everything it needs from the page comes through two interfaces:
`UiTransport` (calls, events, connection state) and `EditorHost` (open an item in the editor, notify).

## Development

```bash
pnpm --filter @sitewright/ui typecheck
```

No build step: the apps use its sources (`exports` → `src`).
