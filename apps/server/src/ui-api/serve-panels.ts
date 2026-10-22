import { AGENT_CHANGED_EVENT, type AgentChanged, refOf, workedLayers } from "@sitewright/core";
import { watchJournals } from "../history/journal-watch.ts";
import type { PluginUiChannel } from "../types/transports.ts";
import type { UiServices } from "../types/ui-api.ts";
import { handleUiCall } from "./handle-ui-call.ts";

/**
 * The journal panels' API (see handleUiCall) on the local app's page. Every new journal entry is pushed to them, and
 * they reload. The layers a call of Claude's changed or read go to the plugin too, which selects them in the editor.
 */
export function servePanels(channel: PluginUiChannel, services: UiServices): void {
  channel.servePanels((method, params) => handleUiCall(method, params, services));
  services.journal.on("appended", (entry) => {
    channel.notify("activity.appended", refOf(entry));

    const nodeIds = workedLayers(entry);

    if (nodeIds.length > 0) {
      channel.notify(AGENT_CHANGED_EVENT, { nodeIds } satisfies AgentChanged);
    }
  });
  services.journal.on("cleared", () => channel.notify("activity.cleared", null));

  if (services.journalDir !== undefined && services.journalDir !== null) {
    watchJournals(services.journalDir, () => channel.notify("activity.changed", null));
  }
}
