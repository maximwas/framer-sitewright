import { useStore } from "zustand";
import { TOAST_COLORS } from "../constants/ui.ts";
import { toastStore } from "../store/toast-store.ts";

/** The page's notifications, bottom right; a click dismisses one, or follows the link it offers. */
export function Toasts() {
  const toasts = useStore(toastStore, (state) => state.toasts);
  const dismiss = useStore(toastStore, (state) => state.dismiss);

  return (
    <ol className="pointer-events-none fixed right-4 bottom-4 z-20 flex max-w-sm flex-col gap-2">
      {toasts.map((toast) => (
        <li key={toast.id}>
          {toast.link === undefined ? (
            <button
              type="button"
              className={`pointer-events-auto h-auto w-full rounded-lg px-3 py-2 text-left font-medium shadow-lg ${TOAST_COLORS[toast.variant]}`}
              onClick={() => dismiss(toast.id)}
            >
              {toast.message}
            </button>
          ) : (
            <a
              href={toast.link}
              target="_blank"
              rel="noopener noreferrer"
              className={`pointer-events-auto block rounded-lg px-3 py-2 font-medium underline shadow-lg ${TOAST_COLORS[toast.variant]}`}
              onClick={() => dismiss(toast.id)}
            >
              {toast.message}
            </a>
          )}
        </li>
      ))}
    </ol>
  );
}
