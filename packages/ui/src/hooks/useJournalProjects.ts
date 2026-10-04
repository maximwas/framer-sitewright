import type { JournalProjects } from "@sitewright/core";
import type { ActivityApiClient } from "../api/activity-api-client.ts";
import type { ServerData } from "../types/activity.ts";
import { useServerData } from "./useServerData.ts";

const loadProjects = (client: ActivityApiClient) => client.projects();

/** The projects with a journal on this computer, reloaded with the journal. */
export function useJournalProjects(): ServerData<JournalProjects> {
  return useServerData(loadProjects);
}
