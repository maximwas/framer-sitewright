# @sitewright/core

The shared core: Framer operations (color tokens, text styles, fonts, nodes, assets, code, publishing), the undo
journal, the DSL and XML formats, and the protocols between the server, the journal window and the plugin. No Node
APIs and no Framer SDK: the same operations run on the Server API (`framer-api`) in the server and on
`@framer/plugin` in the plugin, through a structural port (`FramerPort`, `AgentPort`).

## Pieces

- **Operations** (`operations/`): typed input and output (zod), metadata (`effect`, `idempotent`, `permissions`,
  `needsAgent`, `needsPlugin`) and `describe` for the journal. The registry finds them by name for the plugin.
- **Undo journal** (`history/`): writes record undo steps (`HistoryRecorder`); `history.revert` reverts them and
  records its own steps, so redo is a revert of a revert. Node changes through the DSL are snapshotted before and
  after.
- **Formats:** DSL generation and escaping (`dsl/`), XML for nodes (`xml/`).
- **Protocols:** the bridge protocol (`bridge/protocol.ts`, `schemas/bridge.ts`) between the server and the plugin's
  session, and the relay protocol (`bridge/relay.ts`, `schemas/relay.ts`) between the journal window and the plugin.
- **Testing** (`@sitewright/core/testing`): an in-memory Framer runtime for tests.

Folders: types in `types/`, constants in `constants/`, zod schemas in `schemas/`, pure helpers in `utils/`.

## Development

```bash
pnpm --filter @sitewright/core typecheck
pnpm vitest run --project core
```

The server bundles this package; it is not published on its own.
