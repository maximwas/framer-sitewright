import { ACTIVITY_VIEWS, type ActivityView } from "@sitewright/core";
import { createJSONStorage, persist } from "zustand/middleware";
import { createStore } from "zustand/vanilla";
import { FEED_VIEW_STORAGE_KEY } from "../constants/activity.ts";
import type { FeedViewState } from "../types/activity.ts";

/**
 * Which part of the journal the page shows, and whose: kept in localStorage, so it reopens the way it was left. A
 * remembered view this version no longer has (the plugin's old "off") falls back to the default.
 */
export const feedViewStore = createStore<FeedViewState>()(
  persist(
    (set) => ({
      view: "changes",
      project: null,
      setView: (view) => set({ view }),
      setProject: (project) => set({ project }),
    }),
    {
      name: FEED_VIEW_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ view, project }) => ({
        view,
        project,
      }),
      merge: (persisted, current) => {
        const { view, project } = (persisted ?? {}) as { view?: unknown; project?: unknown };

        return {
          ...current,
          ...(ACTIVITY_VIEWS.includes(view as ActivityView) ? { view: view as ActivityView } : {}),
          ...(typeof project === "string" ? { project } : {}),
        };
      },
    },
  ),
);
