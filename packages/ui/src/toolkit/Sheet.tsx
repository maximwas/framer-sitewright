import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";
import { FADE, SPRING } from "../constants/toolkit.ts";
import type { SheetProps } from "../types/toolkit.ts";

/** A dialog over the panel: the panel dims, the sheet rises from below; Escape closes it. */
export function Sheet({ open, labelledBy, onClose, children }: SheetProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="sheet"
          className="absolute inset-0 z-20 flex flex-col justify-end bg-sw-bg/60 p-2 backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={FADE}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy}
            className="flex max-h-full min-h-0 flex-col gap-3 rounded-2xl border border-sw-line bg-sw-surface p-4 shadow-sw"
            initial={{
              y: 32,
              opacity: 0,
            }}
            animate={{
              y: 0,
              opacity: 1,
            }}
            exit={{
              y: 24,
              opacity: 0,
            }}
            transition={SPRING}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
