import { type ActivitySummary, errorMessage, type RevertReport } from "@sitewright/core";
import { useCallback, useState } from "react";
import type { RestoreFlow, RestoreState } from "../types/activity.ts";
import { describeReport } from "../utils/describe-report.ts";
import { useActivityApi } from "./useActivityApi.ts";
import { useEditorHost } from "./useEditorHost.ts";

/** Restoring to a checkpoint: opening runs a dry run for the preview, confirming restores for real. */
export function useRestore(): RestoreFlow {
  const client = useActivityApi();
  const host = useEditorHost();
  const [state, setState] = useState<RestoreState | null>(null);

  const open = useCallback(
    (checkpoint: ActivitySummary) => {
      // A late preview must not land in a dialog opened for another checkpoint.
      const update = (change: Partial<RestoreState>) =>
        setState((current) =>
          current?.checkpoint.id === checkpoint.id
            ? {
                ...current,
                ...change,
              }
            : current,
        );

      setState({
        checkpoint,
        preview: null,
        running: false,
        error: null,
      });
      client
        .restore(checkpoint, {
          dryRun: true,
          force: false,
        })
        .then(
          (preview: RevertReport) => update({ preview }),
          (error: unknown) => update({ error: errorMessage(error) }),
        );
    },
    [client],
  );

  const confirm = useCallback(
    async (force: boolean) => {
      if (state === null) {
        return;
      }

      setState({
        ...state,
        running: true,
        error: null,
      });

      try {
        const report = await client.restore(state.checkpoint, {
          dryRun: false,
          force,
        });

        host.notify(describeReport(report), "success");
        setState(null);
      } catch (error) {
        setState({
          ...state,
          running: false,
          error: errorMessage(error),
        });
      }
    },
    [client, host, state],
  );

  const close = useCallback(() => setState(null), []);

  return {
    state,
    open,
    confirm,
    close,
  };
}
