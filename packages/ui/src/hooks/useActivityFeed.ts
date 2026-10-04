import type { ActivityView } from "@sitewright/core";
import { useStore } from "zustand";
import type { ActivityApiClient } from "../api/activity-api-client.ts";
import { FEED_LIMIT } from "../constants/activity.ts";
import { feedViewStore } from "../store/feed-view-store.ts";
import type { ActivityFeed, ActivityList } from "../types/activity.ts";
import { useServerData } from "./useServerData.ts";

// One stable loader per view: useServerData reloads when the loader changes, that is when the view does.
const loaders: Readonly<Record<ActivityView, (client: ActivityApiClient) => Promise<ActivityList>>> = {
  all: (client) => client.list(FEED_LIMIT, "all"),
  changes: (client) => client.list(FEED_LIMIT, "changes"),
  reads: (client) => client.list(FEED_LIMIT, "reads"),
  skills: (client) => client.list(FEED_LIMIT, "skills"),
};

/** The journal, newest first, in the view the page shows, live from the server while it is connected. */
export function useActivityFeed(): ActivityFeed {
  return useServerData(loaders[useStore(feedViewStore, (state) => state.view)]);
}
