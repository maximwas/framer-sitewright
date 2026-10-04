import { errorMessage } from "@sitewright/core";
import { useMemo, useState } from "react";
import type { ActivityActions } from "../types/activity.ts";
import { describeReport } from "../utils/describe-report.ts";
import { useActivityApi } from "./useActivityApi.ts";
import { useEditorHost } from "./useEditorHost.ts";

/** Undo, redo and checkpoints from the panel. One action at a time; each reports back in a notification. */
export function useActivityActions(): ActivityActions {
  const client = useActivityApi();
  const host = useEditorHost();
  const [busy, setBusy] = useState(false);

  return useMemo(() => {
    async function run<T>(action: () => Promise<T>, describe: (result: T) => string): Promise<boolean> {
      setBusy(true);

      try {
        host.notify(describe(await action()), "success");

        return true;
      } catch (error) {
        host.notify(errorMessage(error), "error");

        return false;
      } finally {
        setBusy(false);
      }
    }

    return {
      busy,
      undo: async (entry) => {
        await run(() => client.undo(entry), describeReport);
      },
      redo: async (entry) => {
        await run(() => client.redo(entry), describeReport);
      },
      checkpoint: (label) =>
        run(
          () => client.checkpoint(label),
          () => `Checkpoint "${label}" marked.`,
        ),
      clear: () =>
        run(
          () => client.clear(),
          (cleared) =>
            `Journal cleared (${cleared} ${cleared === 1 ? "entry" : "entries"}). The changes stay in Framer.`,
        ),
    };
  }, [client, host, busy]);
}
