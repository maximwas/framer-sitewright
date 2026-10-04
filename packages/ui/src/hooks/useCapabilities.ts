import type { Capabilities } from "@sitewright/core";
import type { ActivityApiClient } from "../api/activity-api-client.ts";
import type { ServerData } from "../types/activity.ts";
import { useServerData } from "./useServerData.ts";

const loadCapabilities = (client: ActivityApiClient) => client.capabilities();

/** What the project's Framer plan allows; rechecked when the journal changes, since refused calls reveal limits. */
export function useCapabilities(): ServerData<Capabilities | null> {
  return useServerData(loadCapabilities);
}
