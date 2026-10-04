import { useStore } from "zustand";
import {
  CONNECTION_BADGE_COLORS,
  CONNECTION_DOT_COLORS,
  CONNECTION_LABELS,
  RELAY_LABELS,
  UNREACHABLE_HINT,
} from "../constants/ui.ts";
import { relayStore } from "../store/relay-store.ts";
import type { AppHeaderProps } from "../types/web.ts";

/** The page title, the project, whether the sitewright server is reachable, and whether this window carries the plugin. */
export function AppHeader({ connection, feed }: AppHeaderProps) {
  const project = feed.status === "ready" ? feed.value.project : null;
  const relay = RELAY_LABELS[useStore(relayStore, ({ state }) => state)];

  return (
    <header className="flex items-center gap-2 border-framer-divider border-b pb-3">
      <div className="flex min-w-0 flex-1 flex-col">
        <h1 className="font-semibold text-[15px] text-framer-text">Claude’s activity</h1>
        <p className="truncate">{project === null ? "sitewright" : project.name}</p>
        {connection === "unreachable" && <p className="text-framer-text">{UNREACHABLE_HINT}</p>}
        {relay !== null && <p className="text-framer-text-secondary">{relay}</p>}
      </div>
      <span
        role="status"
        className={`flex shrink-0 items-center gap-1.5 self-start rounded-full px-2.5 py-1 font-semibold text-[11px] ${CONNECTION_BADGE_COLORS[connection]}`}
      >
        <span aria-hidden className={`size-1.5 rounded-full ${CONNECTION_DOT_COLORS[connection]}`} />
        {CONNECTION_LABELS[connection]}
      </span>
    </header>
  );
}
