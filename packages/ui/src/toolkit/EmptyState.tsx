import { motion } from "motion/react";
import { FADE } from "../constants/toolkit.ts";
import type { EmptyStateProps } from "../types/toolkit.ts";
import { IconTile } from "./IconTile.tsx";

/** What an empty list says, centered, with an icon. */
export function EmptyState({ icon, children }: EmptyStateProps) {
  return (
    <motion.div
      className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-10 text-center"
      initial={{
        opacity: 0,
        y: 8,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={FADE}
    >
      <IconTile icon={icon} tone="accent" />
      <p className="max-w-[28ch] text-[12px] text-sw-ink-3">{children}</p>
    </motion.div>
  );
}
