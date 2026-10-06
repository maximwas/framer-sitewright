import { ConnectionFlow, StatusNote, StatusPill, SupportLinks, Toaster, WindowBar } from "@sitewright/ui";
import { MotionConfig } from "motion/react";
import { useStore } from "zustand";
import { ActionButton } from "./components/ActionButton.tsx";
import { SetupGuide } from "./components/SetupGuide.tsx";
import type { AppProps } from "./types/ui.ts";
import { describeStatus } from "./utils/describe-status.ts";

/**
 * The plugin's window: whether Claude Code can reach this project, the one button that matters now, and how to set
 * the MCP server up. The journal lives in the window Connect opens.
 */
export function App({ link }: AppProps) {
  const status = useStore(link.status);
  const copy = describeStatus(status);
  const connected = status.state === "connected";

  return (
    <MotionConfig reducedMotion="user">
      <main className="flex min-h-full flex-col bg-sw-surface">
        <WindowBar title="Sitewright">
          <StatusPill tone={copy.tone} live={connected}>
            {copy.title}
          </StatusPill>
        </WindowBar>
        <div className="flex flex-col gap-3 p-3.5">
          <ConnectionFlow live={connected} />
          <StatusNote state={status.state} detail={copy.detail} />
          <ActionButton link={link} />
          <SetupGuide />
          <SupportLinks />
        </div>
        <Toaster />
      </main>
    </MotionConfig>
  );
}
