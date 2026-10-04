import { errorMessage, type McpSettings } from "@sitewright/core";
import { useEffect, useState } from "react";
import type { ActivityApiClient } from "../api/activity-api-client.ts";
import type { SettingsState } from "../types/settings.ts";
import { useActivityApi } from "./useActivityApi.ts";
import { useEditorHost } from "./useEditorHost.ts";
import { useServerData } from "./useServerData.ts";

const loadSettings = (client: ActivityApiClient) => client.settings();

/**
 * The plugin's switches: loaded from the server, flipped one at a time, shown as the server saved them until the next
 * load.
 */
export function useSettings(): SettingsState {
  const client = useActivityApi();
  const host = useEditorHost();
  const loaded = useServerData(loadSettings);
  const [saved, setSaved] = useState<McpSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const settings = saved ?? (loaded.status === "ready" ? loaded.value : null);

  // A fresh load (another window or session may have flipped a switch) replaces what this window last saved.
  useEffect(() => {
    if (loaded.status === "ready") {
      setSaved(null);
    }
  }, [loaded]);

  return {
    settings,
    busy,
    toggle: async (key) => {
      if (settings === null) {
        return;
      }

      setBusy(true);

      try {
        setSaved(await client.setSettings({ [key]: !settings[key] }));
      } catch (error) {
        host.notify(errorMessage(error), "error");
      } finally {
        setBusy(false);
      }
    },
  };
}
