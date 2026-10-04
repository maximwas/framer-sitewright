import { SupportLinks } from "@sitewright/ui";
import { useStore } from "zustand";
import { ActionButton } from "./components/ActionButton.tsx";
import { SetupGuide } from "./components/SetupGuide.tsx";
import { StatusBadge } from "./components/StatusBadge.tsx";
import type { AppProps } from "./types/ui.ts";
import { describeStatus } from "./utils/describe-status.ts";

/**
 * The plugin's window: whether Claude Code can reach this project, the one button that matters now, and how to set
 * the MCP server up. The journal lives in the window Connect opens.
 */
export function App({ link }: AppProps) {
  const status = useStore(link.status);
  const { title, detail, tone } = describeStatus(status);

  return (
    <main className="flex flex-col gap-3 px-[15px] pb-[15px]">
      <header className="flex flex-col items-start gap-1.5">
        <StatusBadge title={title} tone={tone} />
        <p className="text-framer-text-secondary">{detail}</p>
      </header>
      <ActionButton link={link} />
      <SetupGuide open={status.state !== "connected"} />
      <SupportLinks />
    </main>
  );
}
