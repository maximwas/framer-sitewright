import type { ActivityView } from "@sitewright/core";
import { useStore } from "zustand";
import type { ActivityApiClient } from "../api/activity-api-client.ts";
import { FEED_LIMIT } from "../constants/activity.ts";
import { feedViewStore } from "../store/feed-view-store.ts";
import type { ActivityFeed, ActivityList } from "../types/activity.ts";
import { useServerData } from "./useServerData.ts";
import { useViewedProject } from "./useViewedProject.ts";

type Loader = (client: ActivityApiClient) => Promise<ActivityList>;

// One stable loader per view and project: useServerData reloads when the loader changes, that is when either does.
const loaders = new Map<string, Loader>();

function loaderFor(view: ActivityView, project: string | null): Loader {
  const key = `${view}:${project ?? ""}`;
  const known = loaders.get(key);

  if (known !== undefined) {
    return known;
  }

  const loader: Loader = (client) => client.list(FEED_LIMIT, view, project);

  loaders.set(key, loader);

  return loader;
}

/** The journal, newest first, in the view the page shows and of the project it shows, live while connected. */
export function useActivityFeed(): ActivityFeed {
  const view = useStore(feedViewStore, (state) => state.view);
  const { picked } = useViewedProject();

  return useServerData(loaderFor(view, picked));
}
