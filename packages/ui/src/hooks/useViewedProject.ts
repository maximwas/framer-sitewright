import { useEffect } from "react";
import { useStore } from "zustand";
import { feedViewStore } from "../store/feed-view-store.ts";
import type { ViewedProject } from "../types/activity.ts";
import { useJournalProjects } from "./useJournalProjects.ts";

/**
 * Whose journal the page shows: the project picked in the switch while it still has a journal and is not the one the
 * plugin is open in, else that one; with no project open, the one changed last. When the plugin opens a project (or
 * another one), the page follows it. Only the open project's journal can be undone from here; any other is for looking.
 */
export function useViewedProject(): ViewedProject {
  const chosen = useStore(feedViewStore, (state) => state.project);
  const data = useJournalProjects();
  const projects = data.status === "ready" ? data.value.projects : [];
  const shown = data.status === "ready" ? data.value.shown : null;
  const shownId = shown?.id ?? null;

  useEffect(() => {
    if (shownId !== null) {
      feedViewStore.getState().setProject(null);
    }
  }, [shownId]);

  const known = (id: string | null) => id !== null && projects.some((project) => project.id === id);
  const picked = chosen !== shown?.id && known(chosen) ? chosen : shown === null ? (projects[0]?.id ?? null) : null;

  return {
    projects,
    shown,
    picked,
    readOnly: picked !== null,
  };
}
