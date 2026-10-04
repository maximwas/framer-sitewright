import { useContext } from "react";
import type { ActivityApiClient } from "../api/activity-api-client.ts";
import { ActivityApiContext } from "../context/ActivityApiContext.tsx";

/** The activity API from the nearest <ActivityApiProvider>. */
export function useActivityApi(): ActivityApiClient {
  const client = useContext(ActivityApiContext);

  if (client === null) {
    throw new Error("useActivityApi must be used inside <ActivityApiProvider>");
  }

  return client;
}
