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
      <button type="button" className="framer-button-primary" onClick={() => link.reconnect()}>
        Reconnect
      </button>
    );
  }

  const connect = state === "needs-window" || state === "waiting";

  return (
    <button type="button" className={connect ? "framer-button-primary" : ""} onClick={() => link.show()}>
      {connect ? "Connect" : "Open journal"}
    </button>
  );
}
