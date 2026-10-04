import { CloseCode } from "@sitewright/core";
import {
  DISABLED_HINT,
  OPEN_PLUGIN_HINT,
  PEER_VERSION_HINT,
  UNAVAILABLE_HINT,
  USE_SERVER_API_HINT,
} from "../../constants/transports.ts";
import type { UpgradeRejection } from "../../types/bridge.ts";
import type { BridgeState } from "../../types/transports.ts";
import { asSentence } from "../../utils/text.ts";

/** What to do while the plugin is not connected. Without the Server API, it also says how to set that up. */
export function pluginHint(
  state: BridgeState,
  rejection: UpgradeRejection | null,
  serverApiConfigured: boolean,
): string {
  const hint = stateHint(state, rejection);

  return serverApiConfigured ? hint : `${hint} ${USE_SERVER_API_HINT}`;
}

function stateHint(state: BridgeState, rejection: UpgradeRejection | null): string {
  switch (state.kind) {
    case "listening":
      return rejection === null ? OPEN_PLUGIN_HINT : rejectionHint(rejection);
    case "peer":
      return OPEN_PLUGIN_HINT;
    case "unavailable":
      return state.closeCode === CloseCode.VersionMismatch ? PEER_VERSION_HINT : UNAVAILABLE_HINT;
    case "disabled":
      return DISABLED_HINT;
    case "failed":
      return `The plugin bridge could not start: ${asSentence(state.reason)} To start over, delete bridge.json in ~/.sitewright (or in SITEWRIGHT_HOME) and reconnect with /mcp.`;
  }
}

function rejectionHint({ reason }: UpgradeRejection): string {
  switch (reason) {
    case "origin":
      return `${OPEN_PLUGIN_HINT} A page outside the local app tried to open the plugin socket and was refused; ignore it.`;
    case "token":
      return `${OPEN_PLUGIN_HINT} Another process tried to join the bridge with a stale token and was refused.`;
    case "host":
      return `${OPEN_PLUGIN_HINT} A connection with an unexpected Host header was refused (a DNS-rebinding attempt or a proxy).`;
  }
}
