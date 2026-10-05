import { createStore } from "zustand/vanilla";
import { TOAST_LINK_MS, TOAST_MS } from "../constants/toolkit.ts";
import type { ToastState } from "../types/toolkit.ts";

let sequence = 0;

/** The notifications the Toaster shows, in the web app and in the plugin alike. */
export const toastStore = createStore<ToastState>()((set, get) => ({
  toasts: [],
  show: (message, variant, link) => {
    const toast = {
      id: ++sequence,
      message,
      variant,
      ...(link === undefined ? {} : { link }),
    };

    set((state) => ({ toasts: [...state.toasts, toast] }));
    setTimeout(() => get().dismiss(toast.id), link === undefined ? TOAST_MS : TOAST_LINK_MS);
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}));
