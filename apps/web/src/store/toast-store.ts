import { createStore } from "zustand/vanilla";
import { TOAST_LINK_MS, TOAST_MS } from "../constants/web.ts";
import type { ToastState } from "../types/web.ts";

let sequence = 0;

/** The page's notifications: what the plugin shows with framer.notify, the web app shows as toasts. */
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
