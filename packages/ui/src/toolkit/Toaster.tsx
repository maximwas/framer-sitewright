import { ArrowUpRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useStore } from "zustand";
import { SPRING, TOAST_ICONS } from "../constants/toolkit.ts";
import { toastStore } from "../store/toast-store.ts";

/** The notifications: dark pills that spring up from the bottom; a click dismisses one, or follows its link. */
export function Toaster() {
  const toasts = useStore(toastStore, (state) => state.toasts);
  const dismiss = useStore(toastStore, (state) => state.dismiss);

  return (
    <ol className="pointer-events-none fixed inset-x-3 bottom-3 z-50 flex flex-col-reverse items-center gap-2">
      <AnimatePresence initial={false}>
        {toasts.map((toast) => {
          const { icon: Icon, className } = TOAST_ICONS[toast.variant];
          const body = (
            <>
              <Icon aria-hidden className={`size-4 shrink-0 ${className}`} />
              <span className="min-w-0 text-left">{toast.message}</span>
              {toast.link !== undefined && <ArrowUpRight aria-hidden className="size-3.5 shrink-0" />}
            </>
          );
          const pill =
            "pointer-events-auto flex h-auto w-auto max-w-[min(420px,100%)] items-center gap-2 rounded-full border-0 bg-sw-ink px-3.5 py-2 font-semibold text-[12px] text-sw-bg shadow-sw";

          return (
            <motion.li
              key={toast.id}
              layout
              role="status"
              initial={{
                opacity: 0,
                y: 20,
                scale: 0.96,
              }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
              }}
              exit={{
                opacity: 0,
                y: 10,
                scale: 0.96,
              }}
              transition={SPRING}
              className="flex max-w-full justify-center"
            >
              {toast.link === undefined ? (
                <button type="button" className={pill} onClick={() => dismiss(toast.id)}>
                  {body}
                </button>
              ) : (
                <a
                  href={toast.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${pill} no-underline`}
                  onClick={() => dismiss(toast.id)}
                >
                  {body}
                </a>
              )}
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ol>
  );
}
