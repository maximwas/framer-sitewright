import { Collapse, IconButton, StatusNote, StatusPill, SupportLinks, Toaster, WindowBar } from "@sitewright/ui";
import { ChevronDown, ChevronUp } from "lucide-react";
import { MotionConfig } from "motion/react";
import { useRef } from "react";
import { useStore } from "zustand";
import { version as pluginVersion } from "../package.json";
import { ActionButton } from "./components/ActionButton.tsx";
import { SetupGuide } from "./components/SetupGuide.tsx";
import { UpdateNote } from "./components/UpdateNote.tsx";
import { fitPluginWindow } from "./framer/plugin.ts";
import { useFitWindow } from "./hooks/use-fit-window.ts";
import { windowStore } from "./store/window-store.ts";
import type { AppProps } from "./types/ui.ts";
import { describeStatus } from "./utils/describe-status.ts";
import { serverUpdate } from "./utils/update.ts";

/**
 * The plugin's window, kept small: whether Claude Code can reach this project and the one button that matters now.
 * Until it connects, what that state means and how to set the MCP server up too. The journal lives in the window
 * Connect opens; the window's height follows its content, and the user folds it to its bar or opens it again.
 */
export function App({ link }: AppProps) {
  const status = useStore(link.status);
  const copy = describeStatus(status);
  const connected = status.state === "connected";
  const update = serverUpdate(status, pluginVersion);
  const collapsed = useStore(windowStore, (state) => state.collapsed);
  const toggle = useStore(windowStore, (state) => state.toggle);
  const content = useRef<HTMLDivElement>(null);

  useFitWindow(content, fitPluginWindow);

  return (
    <MotionConfig reducedMotion="user">
      <main className="flex min-h-full flex-col bg-sw-surface">
        <div ref={content}>
          <WindowBar title="Sitewright">
            <StatusPill tone={copy.tone} live={connected}>
              {copy.title}
            </StatusPill>
            <IconButton
              icon={collapsed ? ChevronDown : ChevronUp}
              label={collapsed ? "Expand" : "Collapse"}
              aria-expanded={!collapsed}
              onClick={toggle}
            />
          </WindowBar>
          <Collapse open={!collapsed}>
            <div className="flex flex-col gap-3 p-3.5">
              {!connected && <StatusNote state={status.state} detail={copy.detail} />}
              {update !== null && <UpdateNote serverVersion={update.serverVersion} />}
              <ActionButton link={link} />
              {!connected && <SetupGuide />}
              <SupportLinks />
            </div>
          </Collapse>
        </div>
        <Toaster />
      </main>
    </MotionConfig>
  );
}
