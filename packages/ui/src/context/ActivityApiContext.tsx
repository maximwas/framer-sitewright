import { createContext } from "react";
import type { ActivityApiClient } from "../api/activity-api-client.ts";
import type { ActivityApiProviderProps } from "../types/props.ts";

/** The server's activity journal and plan limits; read it with useActivityApi(). */
export const ActivityApiContext = createContext<ActivityApiClient | null>(null);

export function ActivityApiProvider({ client, children }: ActivityApiProviderProps) {
  return <ActivityApiContext.Provider value={client}>{children}</ActivityApiContext.Provider>;
}
