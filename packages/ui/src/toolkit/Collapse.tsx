import { AnimatePresence, motion } from "motion/react";
import { FADE } from "../constants/toolkit.ts";
import type { CollapseProps } from "../types/toolkit.ts";

/** Content that unfolds and folds by height, instead of popping in. */
export function Collapse({ open, children }: CollapseProps) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          key="content"
          initial={{
            height: 0,
            opacity: 0,
          }}
          animate={{
            height: "auto",
            opacity: 1,
          }}
          exit={{
            height: 0,
            opacity: 0,
          }}
          transition={FADE}
          className="overflow-hidden"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
