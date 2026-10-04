import { useState } from "react";
import { useStore } from "zustand";
import { EMPTY_FEED_TEXT } from "../constants/activity.ts";
import { useActivityActions } from "../hooks/useActivityActions.ts";
import { useCapabilities } from "../hooks/useCapabilities.ts";
import { useRestore } from "../hooks/useRestore.ts";
import { feedViewStore } from "../store/feed-view-store.ts";
import type { ActivityPanelProps } from "../types/props.ts";
import { ActivityFeed } from "./ActivityFeed.tsx";
import { ActivityToolbar } from "./ActivityToolbar.tsx";
import { CapabilityBanner } from "./CapabilityBanner.tsx";
import { CheckpointForm } from "./CheckpointForm.tsx";
import { ClearConfirm } from "./ClearConfirm.tsx";
import { RestoreDialog } from "./RestoreDialog.tsx";
import { SettingsPanel } from "./SettingsPanel.tsx";
import { ViewSwitch } from "./ViewSwitch.tsx";

/**
 * Everything Claude did in this project, with undo, redo and checkpoints; the switch picks the changes, the reads, the
 * skills or all of it, and the gear opens the settings.
 */
export function ActivityPanel({ feed }: ActivityPanelProps) {
  const actions = useActivityActions();
  const restore = useRestore();
  const capabilities = useCapabilities();
  const [prompt, setPrompt] = useState<"mark" | "clear" | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const view = useStore(feedViewStore, (state) => state.view);
  const list = feed.status === "ready" ? feed.value : null;
  const entries = list?.entries ?? [];

  if (showSettings) {
    return <SettingsPanel onClose={() => setShowSettings(false)} />;
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-2.5">
      <CapabilityBanner capabilities={capabilities} />
      {prompt === "mark" && (
        <CheckpointForm
          busy={actions.busy}
          onSave={async (label) => {
            if (await actions.checkpoint(label)) {
              setPrompt(null);
            }
          }}
          onCancel={() => setPrompt(null)}
        />
      )}
      {prompt === "clear" && (
        <ClearConfirm
          busy={actions.busy}
          onConfirm={async () => {
            if (await actions.clear()) {
              setPrompt(null);
            }
          }}
          onCancel={() => setPrompt(null)}
        />
      )}
      {prompt === null && (
        <ActivityToolbar
          canUndo={list?.canUndo ?? entries.some((entry) => entry.undoable)}
          canRedo={list?.canRedo ?? entries.some((entry) => entry.redoable)}
          canClear={(list?.total ?? entries.length) > 0}
          busy={actions.busy}
          onUndo={() => void actions.undo()}
          onRedo={() => void actions.redo()}
          onMark={() => setPrompt("mark")}
          onClear={() => setPrompt("clear")}
          onSettings={() => setShowSettings(true)}
        />
      )}
      <ViewSwitch />
      <ActivityFeed feed={feed} actions={actions} onRestore={restore.open} emptyText={EMPTY_FEED_TEXT[view]} />
      {restore.state !== null && <RestoreDialog flow={restore} state={restore.state} />}
    </section>
  );
}
