import { Button } from "@sitewright/ui";
import { ExternalLink, Plug, RotateCcw } from "lucide-react";
import { useStore } from "zustand";
import type { AppProps } from "../types/ui.ts";

/**
 * The one thing to do now: open the journal window (Connect), bring it forward (Open journal), or start again after
 * the bridge stopped for good (Reconnect). Browsers open a window only on a click.
 */
export function ActionButton({ link }: AppProps) {
  const { state } = useStore(link.status);

  if (state === "stopped") {
    return (
      <Button size="lg" variant="primary" icon={RotateCcw} className="w-full" onClick={() => link.reconnect()}>
        Reconnect
      </Button>
    );
  }

  const connect = state === "needs-window" || state === "waiting";

  return (
    <Button
      size="lg"
      variant={connect ? "primary" : "secondary"}
      icon={connect ? Plug : ExternalLink}
      className="w-full"
      onClick={() => link.show()}
    >
      {connect ? "Connect" : "Open journal"}
    </Button>
  );
}
