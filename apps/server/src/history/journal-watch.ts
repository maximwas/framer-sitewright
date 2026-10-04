import { mkdirSync, watch } from "node:fs";
import { JOURNAL_WATCH_DEBOUNCE_MS } from "../constants/history.ts";

/**
 * Calls `onChange` once per burst of writes to the journal folder, whichever sitewright process (Claude Code session)
 * wrote: the page shows other sessions' entries as they land, not only this process's. Best effort: without a watch
 * (an unsupported file system) the page still reloads on this process's own entries.
 */
export function watchJournals(dir: string, onChange: () => void): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    mkdirSync(dir, {
      recursive: true,
      mode: 0o700,
    });

    const watcher = watch(dir, (_event, file) => {
      if (file !== null && !file.endsWith(".jsonl")) {
        return;
      }

      clearTimeout(timer);
      timer = setTimeout(onChange, JOURNAL_WATCH_DEBOUNCE_MS);
    });

    watcher.on("error", () => watcher.close());
    // The watch must not keep the MCP server alive after its client goes.
    watcher.unref();

    return () => {
      clearTimeout(timer);
      watcher.close();
    };
  } catch {
    return () => undefined;
  }
}
