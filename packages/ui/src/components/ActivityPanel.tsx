import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { useStore } from "zustand";
import { EMPTY_FEED_TEXT, NO_PLUGIN_NOTE, OTHER_PROJECT_NOTE } from "../constants/activity.ts";
import { FADE } from "../constants/toolkit.ts";
import { useActivityActions } from "../hooks/useActivityActions.ts";
import { useCapabilities } from "../hooks/useCapabilities.ts";
import { useRestore } from "../hooks/useRestore.ts";
import { useViewedProject } from "../hooks/useViewedProject.ts";
import { feedViewStore } from "../store/feed-view-store.ts";
import { Collapse } from "../toolkit/Collapse.tsx";
import type { ActivityPanelProps } from "../types/props.ts";
import { ActivityFeed } from "./ActivityFeed.tsx";
import { ActivityToolbar } from "./ActivityToolbar.tsx";
import { CapabilityBanner } from "./CapabilityBanner.tsx";
import { CheckpointForm } from "./CheckpointForm.tsx";
import { ClearConfirm } from "./ClearConfirm.tsx";
import { ProjectSwitch } from "./ProjectSwitch.tsx";
import { RestoreDialog } from "./RestoreDialog.tsx";
import { SettingsPanel } from "./SettingsPanel.tsx";
import { ViewSwitch } from "./ViewSwitch.tsx";

/**
 * Everything Claude did in this project, with undo, redo and checkpoints; the switch picks the changes, the reads, the
 * skills or all of it, and the gear slides the settings in.
 */
export function ActivityPanel({ feed }: ActivityPanelProps) {
  const actions = useActivityActions();
  const restore = useRestore();
  const capabilities = useCapabilities();
  const [prompt, setPrompt] = useState<"mark" | "clear" | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const view = useStore(feedViewStore, (state) => state.view);
  const { readOnly, shown, picked } = useViewedProject();
  const list = feed.status === "ready" ? feed.value : null;
  const entries = list?.entries ?? [];

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <AnimatePresence mode="wait" initial={false}>
        {showSettings ? (
          <motion.div
            key="settings"
            className="flex min-h-0 flex-1 flex-col"
            initial={{
              x: 32,
              opacity: 0,
            }}
            animate={{
              x: 0,
              opacity: 1,
            }}
            exit={{
              x: 32,
              opacity: 0,
            }}
            transition={FADE}
          >
            <SettingsPanel onClose={() => setShowSettings(false)} />
          </motion.div>
        ) : (
          <motion.section
            key="journal"
            className="flex min-h-0 flex-1 flex-col gap-2.5 px-3 pt-3"
            initial={{
              x: -32,
              opacity: 0,
            }}
            animate={{
              x: 0,
              opacity: 1,
            }}
            exit={{
              x: -32,
              opacity: 0,
            }}
            transition={FADE}
          >
            <ProjectSwitch />
            {readOnly && (
              <p className="text-[12px] text-sw-ink-3">{shown === null ? NO_PLUGIN_NOTE : OTHER_PROJECT_NOTE}</p>
            )}
            <CapabilityBanner capabilities={capabilities} />
            <ActivityToolbar
              readOnly={readOnly}
              canUndo={list?.canUndo ?? entries.some((entry) => entry.undoable)}
              canRedo={list?.canRedo ?? entries.some((entry) => entry.redoable)}
              canClear={(list?.total ?? entries.length) > 0}
              busy={actions.busy}
              onUndo={() => void actions.undo()}
              onRedo={() => void actions.redo()}
              onMark={() => setPrompt(prompt === "mark" ? null : "mark")}
              onClear={() => setPrompt(prompt === "clear" ? null : "clear")}
              onSettings={() => setShowSettings(true)}
            />
            <Collapse open={prompt === "mark"}>
              <CheckpointForm
                busy={actions.busy}
                onSave={async (label) => {
                  if (await actions.checkpoint(label)) {
                    setPrompt(null);
                  }
                }}
                onCancel={() => setPrompt(null)}
              />
            </Collapse>
            <Collapse open={prompt === "clear"}>
              <ClearConfirm
                busy={actions.busy}
                onConfirm={async () => {
                  if (await actions.clear(picked ?? undefined)) {
                    setPrompt(null);
                  }
                }}
                onCancel={() => setPrompt(null)}
              />
            </Collapse>
            <ViewSwitch />
            <ActivityFeed
              feed={feed}
              actions={actions}
              onRestore={restore.open}
              emptyText={EMPTY_FEED_TEXT[view]}
              readOnly={readOnly}
            />
          </motion.section>
        )}
      </AnimatePresence>
      <RestoreDialog flow={restore} state={restore.state} />
    </div>
  );
}
