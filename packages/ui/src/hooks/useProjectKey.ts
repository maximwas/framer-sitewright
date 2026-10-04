import { errorMessage, type ProjectKeyStatus } from "@sitewright/core";
import { useEffect, useState } from "react";
import type { ActivityApiClient } from "../api/activity-api-client.ts";
import type { ProjectKeyState } from "../types/settings.ts";
import { useActivityApi } from "./useActivityApi.ts";
import { useEditorHost } from "./useEditorHost.ts";
import { useServerData } from "./useServerData.ts";

const loadKeyStatus = (client: ActivityApiClient) => client.keyStatus();

/** The Server API key of the project the plugin is open in: loaded from the server, saved or removed one at a time. */
export function useProjectKey(): ProjectKeyState {
  const client = useActivityApi();
  const host = useEditorHost();
  const loaded = useServerData(loadKeyStatus);
  const [changed, setChanged] = useState<ProjectKeyStatus | null>(null);
  const [busy, setBusy] = useState(false);

  // A fresh load (another project opened in the plugin) replaces what this page last saved.
  useEffect(() => {
    if (loaded.status === "ready") {
      setChanged(null);
    }
  }, [loaded]);

  const run = async (action: () => Promise<ProjectKeyStatus>): Promise<boolean> => {
    setBusy(true);

    try {
      setChanged(await action());

      return true;
    } catch (error) {
      host.notify(errorMessage(error), "error");

      return false;
    } finally {
      setBusy(false);
    }
  };

  return {
    status: changed ?? (loaded.status === "ready" ? loaded.value : null),
    busy,
    save: (key, url) => run(() => client.saveKey(key, url)),
    remove: async () => {
      await run(() => client.removeKey());
    },
  };
}
