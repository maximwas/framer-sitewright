# @sitewright/ui

The journal panel (React 18, Tailwind CSS 4, zustand, Motion) of the local page (`apps/web`), and the toolkit the
plugin shares with it: Sitewright's palette as Tailwind colors (`theme.css`, `sw-*`, light and dark), animated
primitives (`Button`, `Segmented`, `Switch`, `Collapse`, `Sheet`, `CopyField`, `StatusPill`, `WindowBar`, the
`Toaster` with `toastStore`, `LogoMark`), `framerCss()` for Vite and `SupportLinks`. The look is the website's journal.

The panel shows Claude's calls newest first in five views (All, Changes with the skills used for them, CMS, Reads,
Skills), each call's layer badge (Plugin API, Server API, Framer agent), Undo / Redo, checkpoints and Restore with a
preview, the plan banner and the settings. Everything it needs from the page comes through two interfaces:
`UiTransport` (calls, events, connection state) and `EditorHost` (open an item in the editor, notify).

## Development

```bash
pnpm --filter @sitewright/ui typecheck
```

No build step: the apps use its sources (`exports` → `src`).
