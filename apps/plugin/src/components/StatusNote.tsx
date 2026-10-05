import { FADE } from "@sitewright/ui";
import { AnimatePresence, motion } from "motion/react";
import type { StatusNoteProps } from "../types/ui.ts";

/** What the state means and what to do, sliding in when the state changes. */
export function StatusNote({ state, detail }: StatusNoteProps) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.p
        key={state}
        className="text-[12px] text-sw-ink-2 leading-relaxed"
        initial={{
          opacity: 0,
          y: 6,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        exit={{
          opacity: 0,
          y: -6,
        }}
        transition={FADE}
      >
        {detail}
      </motion.p>
    </AnimatePresence>
  );
}
