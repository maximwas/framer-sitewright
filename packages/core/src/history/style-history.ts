import { indexByPath } from "../styles/style-index.ts";
import type { ColorStyleData, TextStyleData } from "../types/framer-port.ts";
import type { ColorStyleState, StyleHistoryScope, StyleKind, TextStyleState } from "../types/history.ts";
import type { HistoryRecorder } from "./recorder.ts";
import { colorStyleState, sameState, textStyleState } from "./style-states.ts";

export const colorStyleKind: StyleKind<ColorStyleData, ColorStyleState> = {
  read: (runtime) => runtime.port.getColorStyles(),
  state: colorStyleState,
  step: (id, before, after) => ({
    kind: "color-style",
    id,
    before,
    after,
  }),
};

export const textStyleKind: StyleKind<TextStyleData, TextStyleState> = {
  read: (runtime) => runtime.port.getTextStyles(),
  state: textStyleState,
  step: (id, before, after) => ({
    kind: "text-style",
    id,
    before,
    after,
  }),
};

/**
 * Runs a style write and records what really changed among `paths`: the state decides, not the errors, so a
 * batch that fails halfway still records the part it applied.
 */
export async function withStyleHistory<T, S extends { readonly id: string; readonly path: string }, State>(
  scope: StyleHistoryScope<S, State>,
  write: () => Promise<T>,
): Promise<T> {
  const { history } = scope;

  if (history === undefined || scope.dryRun) {
    return write();
  }

  const before = new Map(
    [...scope.before].map(([path, style]) => [
      path,
      {
        id: style.id,
        state: scope.kind.state(style),
      },
    ]),
  );
  const targets = (scope.targets ?? []).map((style) => ({
    id: style.id,
    state: scope.kind.state(style),
  }));

  try {
    return await write();
  } finally {
    await recordChanges(history, scope, before);
    await recordTargets(history, scope, targets);
  }
}

/** Targets by id: two styles may share a path, and a folder delete names none. Never throws, like recordChanges. */
async function recordTargets<S extends { readonly id: string; readonly path: string }, State>(
  history: HistoryRecorder,
  { runtime, kind }: StyleHistoryScope<S, State>,
  targets: readonly { id: string; state: State }[],
): Promise<void> {
  if (targets.length === 0) {
    return;
  }

  try {
    const current = new Map((await kind.read(runtime)).map((style) => [style.id, style]));

    for (const { id, state } of targets) {
      const now = current.get(id);
      const nowState = now === undefined ? null : kind.state(now);

      if (nowState === null || !sameState(state, nowState)) {
        history.record(kind.step(id, state, nowState));
      }
    }
  } catch (error) {
    history.markIncomplete(`The styles could not be re-read after the write: ${String(error)}`);
  }
}

// Never throws: a failed re-read must not hide the write's own result or error.
async function recordChanges<S extends { readonly id: string; readonly path: string }, State>(
  history: HistoryRecorder,
  { runtime, kind, paths }: StyleHistoryScope<S, State>,
  before: ReadonlyMap<string, { id: string; state: State }>,
): Promise<void> {
  try {
    const current = await indexByPath(kind.read(runtime));

    for (const path of new Set(paths)) {
      const was = before.get(path);
      const now = current.get(path);
      const nowState = now === undefined ? null : kind.state(now);
      const id = now?.id ?? was?.id;

      if (id === undefined || (was !== undefined && nowState !== null && sameState(was.state, nowState))) {
        continue;
      }

      history.record(kind.step(id, was?.state ?? null, nowState));
    }
  } catch (error) {
    history.markIncomplete(`The styles could not be re-read after the write: ${String(error)}`);
  }
}
