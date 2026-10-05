import { ACTIVITY_VIEWS, type ActivityView } from "@sitewright/core";
import { createJSONStorage, persist } from "zustand/middleware";
import { createStore } from "zustand/vanilla";
import { FEED_VIEW_STORAGE_KEY } from "../constants/activity.ts";
import type { FeedViewState } from "../types/activity.ts";

/**
 * Which part of the journal the page shows, and whose. The view is kept in localStorage, so it reopens the way it was
 * left (a view this version no longer has falls back to the default); another project picked to look at is not: the
 * page opens on the project the plugin is open in.
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
      partialize: ({ view }) => ({ view }),
      merge: (persisted, current) => {
        const { view } = (persisted ?? {}) as { view?: unknown };

        return {
          ...current,
          ...(ACTIVITY_VIEWS.includes(view as ActivityView) ? { view: view as ActivityView } : {}),
        };
      },
    },
  ),
);
