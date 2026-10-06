import { BRIDGE_INFO_PATH, BRIDGE_PATH, BridgeInfoSchema } from "@sitewright/core";
import { PluginBridge } from "./plugin-bridge.ts";

/**
 * Starts the window's side of the plugin bridge: the plugin origins come from the server, the plugin that opened the
 * page hears `ready`, a hidden window retries at once when it is shown again (timers lag in hidden tabs), and leaving
 * the page ends the plugin's session.
 */
export async function startPluginBridge(): Promise<PluginBridge> {
  const info = BridgeInfoSchema.parse(await (await fetch(BRIDGE_INFO_PATH)).json());
  const bridge = new PluginBridge({
    socketUrl: `ws://${location.host}${BRIDGE_PATH}`,
    pluginOrigins: info.pluginOrigins,
    opener: window.opener as Window | null,
    // The window looks like the Framer editor around it, not like the system.
    onTheme: (theme) => {
      document.documentElement.classList.remove("sw-system");
      document.documentElement.dataset["framerTheme"] = theme;
    },
  });

  bridge.start();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      bridge.retryNow();
    }
  });
  window.addEventListener("pagehide", () => bridge.close());

  return bridge;
}
