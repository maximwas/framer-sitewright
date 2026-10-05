import { errorMessage, RevealResultSchema } from "@sitewright/core";
import { type EditorHost, toastStore } from "@sitewright/ui";
import type { WebSocketClient } from "../api/web-socket-client.ts";

/**
 * The panel in a browser tab. An item opens in the Framer editor if the plugin is open there (the server relays it),
 * else in a new tab through the project's editor link.
 */
export function createWebHost(client: WebSocketClient): EditorHost {
  const { show } = toastStore.getState();

  return {
    reveal: async (item) => {
      try {
        const { relayed, url } = RevealResultSchema.parse(await client.call("editor.reveal", { id: item.id }));

        if (relayed) {
          show(`Shown ${item.path} in the Framer editor.`, "info");
        } else if (url === null) {
          show(`Open the project in Framer to see ${item.path}.`, "warning");
        } else {
          // Opened after the server answered, a tab may be blocked (Safari): then the link goes in a notification.
          const tab = window.open(url, "_blank");

          if (tab === null) {
            show(`Open ${item.path} in Framer ↗`, "info", url);
          } else {
            tab.opener = null;
          }
        }
      } catch (error) {
        show(errorMessage(error), "error");
      }
    },
    notify: show,
  };
}
