import { createJSONStorage, persist } from "zustand/middleware";
import { createStore } from "zustand/vanilla";
import { WINDOW_STORAGE_KEY } from "../constants/ui.ts";
import type { PluginWindowState } from "../types/ui.ts";

/**
 * Whether the plugin window is folded to its bar: the user's choice, kept in localStorage so the window opens the way it
 * was left. Without storage (a sandbox that refuses it) it simply opens unfolded.
 */
export const windowStore = createStore<PluginWindowState>()(
  persist(
    (set) => ({
      collapsed: false,
      toggle: () => set((state) => ({ collapsed: !state.collapsed })),
    }),
    {
      name: WINDOW_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ collapsed }) => ({ collapsed }),
    },
  ),
);
