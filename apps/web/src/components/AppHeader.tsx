import { ConnectionFlow, StatusNote, StatusPill, WindowBar } from "@sitewright/ui";
import { useStore } from "zustand";
import { CONNECTION_STATUS, RELAY_LABELS, UNREACHABLE_HINT } from "../constants/ui.ts";
import { relayStore } from "../store/relay-store.ts";
import type { AppHeaderProps } from "../types/web.ts";

/**
 * The window's top, the same as the plugin's: the bar with the server's status, the flow from Claude Code to the
 * project (live while this window carries the plugin's bridge), and what the state means.
 */
export function AppHeader({ connection }: AppHeaderProps) {
  const relay = useStore(relayStore, ({ state }) => state);
  const status = CONNECTION_STATUS[connection];
  const live = connection === "connected" && relay === "connected";

  return (
    <div className="flex flex-col">
      <WindowBar title="Sitewright">
        <StatusPill tone={status.tone} live={connection === "connected"}>
          {status.label}
        </StatusPill>
      </WindowBar>
      <div className="flex flex-col gap-3 border-sw-line border-b p-3.5">
        <ConnectionFlow live={live} />
        <StatusNote
          state={connection === "unreachable" ? connection : relay}
          detail={connection === "unreachable" ? UNREACHABLE_HINT : RELAY_LABELS[relay]}
        />
      </div>
    </div>
  );
}
