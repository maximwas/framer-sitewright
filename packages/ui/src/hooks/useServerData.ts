import { errorMessage } from "@sitewright/core";
import { useEffect, useState } from "react";
import type { ActivityApiClient } from "../api/activity-api-client.ts";
import type { ServerData } from "../types/activity.ts";
import { useActivityApi } from "./useActivityApi.ts";
import { useConnected } from "./useConnected.ts";

type Load<T> = (client: ActivityApiClient) => Promise<T>;

/**
 * Data from the server, loaded while it is connected and reloaded whenever the journal changes. Only the newest load
 * counts, so a slow answer never overwrites a newer one. `load` must be stable (a module-level function); a new one
 * (another journal view) starts over from loading, so data of the old one never shows as its.
 */
export function useServerData<T>(load: Load<T>): ServerData<T> {
  const client = useActivityApi();
  const connected = useConnected();
  const [data, setData] = useState<{ readonly load: Load<T> | null; readonly value: ServerData<T> }>({
    load: null,
    value: { status: "idle" },
  });

  useEffect(() => {
    if (!connected) {
      setData({
        load: null,
        value: { status: "idle" },
      });

      return;
    }

    let newest = 0;
    let active = true;
    const reload = () => {
      const request = ++newest;
      const settle = (value: ServerData<T>) => {
        if (active && request === newest) {
          setData({
            load,
            value,
          });
        }
      };

      load(client).then(
        (value) =>
          settle({
            status: "ready",
            value,
          }),
        (error: unknown) =>
          settle({
            status: "error",
            message: errorMessage(error),
          }),
      );
    };

    // A reload of the same data keeps showing it; another loader's data does not stand in.
    setData((current) =>
      current.load === load && current.value.status === "ready"
        ? current
        : {
            load,
            value: { status: "loading" },
          },
    );
    reload();

    const unsubscribe = client.onChange(reload);

    return () => {
      active = false;
      unsubscribe();
    };
  }, [client, connected, load]);

  return data.load === null || data.load === load ? data.value : { status: "loading" };
}
