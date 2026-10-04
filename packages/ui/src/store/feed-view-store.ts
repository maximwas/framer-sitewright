import { ACTIVITY_VIEWS, type ActivityView } from "@sitewright/core";
import { createJSONStorage, persist } from "zustand/middleware";
import { createStore } from "zustand/vanilla";
import { FEED_VIEW_STORAGE_KEY } from "../constants/activity.ts";
import type { FeedViewState } from "../types/activity.ts";

/**
 * Which part of the journal the page shows; kept in localStorage, so it reopens the way it was left. A remembered view
 * this version no longer has (the plugin's old "off") falls back to the default.
 */
export const feedViewStore = createStore<FeedViewState>()(
  persist(
    (set) => ({
      view: "changes",
      setView: (view) => set({ view }),
    }),
    {
      name: FEED_VIEW_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ view }) => ({ view }),
      merge: (persisted, current) => {
        const view = (persisted as { view?: unknown } | undefined)?.view;

        return ACTIVITY_VIEWS.includes(view as ActivityView)
          ? {
              ...current,
              view: view as ActivityView,
            }
          : current;
      },
    },
  ),
);
