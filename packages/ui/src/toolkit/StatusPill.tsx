import { motion } from "motion/react";
import { TONE_DOTS, TONE_TEXT } from "../constants/toolkit.ts";
import type { StatusPillProps } from "../types/toolkit.ts";

/** Where a connection stands: a dot and a word; the dot pulses while the connection is live. */
export function StatusPill({ tone, live = false, children }: StatusPillProps) {
  return (
    <span
      role="status"
      className={`inline-flex min-w-0 items-center gap-1.5 font-semibold text-[11.5px] ${TONE_TEXT[tone]}`}
    >
      <span className={`relative size-[7px] shrink-0 rounded-full ${TONE_DOTS[tone]}`}>
        {live && (
          <motion.span
            aria-hidden
            className={`absolute inset-0 rounded-full ${TONE_DOTS[tone]}`}
            animate={{
              scale: [1, 2.6],
              opacity: [0.5, 0],
            }}
            transition={{
              duration: 1.6,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeOut",
            }}
          />
        )}
      </span>
      <span className="truncate">{children}</span>
    </span>
  );
}
