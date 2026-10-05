import { StatusPill, WindowBar } from "@sitewright/ui";
import { AnimatePresence, motion } from "motion/react";
import { useStore } from "zustand";
import { CONNECTION_STATUS, RELAY_LABELS, UNREACHABLE_HINT } from "../constants/ui.ts";
import { relayStore } from "../store/relay-store.ts";
import type { AppHeaderProps } from "../types/web.ts";

/**
 * The window's bar: the journal of which project, and whether the sitewright server is reachable; below it, whether
 * this window carries the plugin's bridge, or what to do while the server is away.
 */
export function AppHeader({ connection, feed }: AppHeaderProps) {
  const project = feed.status === "ready" ? (feed.value.project?.name ?? null) : null;
  const relay = RELAY_LABELS[useStore(relayStore, ({ state }) => state)];
  const status = CONNECTION_STATUS[connection];
  const note = connection === "unreachable" ? UNREACHABLE_HINT : relay;

  return (
    <div className="flex flex-col">
      <WindowBar title="Journal" subtitle={project}>
        <StatusPill tone={status.tone} live={connection === "connected"}>
          {status.label}
        </StatusPill>
      </WindowBar>
      <AnimatePresence initial={false}>
        {note !== null && (
          <motion.p
            key={note}
            className="border-sw-line border-b bg-sw-surface-2/40 px-3.5 py-2 text-[12px] text-sw-ink-2"
            initial={{
              opacity: 0,
              height: 0,
            }}
            animate={{
              opacity: 1,
              height: "auto",
            }}
            exit={{
              opacity: 0,
              height: 0,
            }}
          >
            {note}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
