import { refOf } from "@sitewright/core";
import type { PluginUiChannel } from "../types/transports.ts";
import type { UiServices } from "../types/ui-api.ts";
import { handleUiCall } from "./handle-ui-call.ts";

/**
 * The journal panels' API (see handleUiCall) on the local app's page. Every new journal entry is pushed to them, and
 * they reload.
 */
export function servePanels(channel: PluginUiChannel, services: UiServices): void {
  channel.servePanels((method, params) => handleUiCall(method, params, services));
  services.journal.on("appended", (entry) => channel.notify("activity.appended", refOf(entry)));
  services.journal.on("cleared", () => channel.notify("activity.cleared", null));
}
