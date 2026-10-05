import { motion } from "motion/react";
import { SPRING_PRESS } from "../constants/toolkit.ts";
import type { IconButtonProps } from "../types/toolkit.ts";

/** A square button with only an icon: the label goes to screen readers and the tooltip. */
export function IconButton({ icon: Icon, label, className = "", type = "button", ...rest }: IconButtonProps) {
  return (
    <motion.button
      type={type}
      aria-label={label}
      title={label}
      whileTap={{ scale: 0.92 }}
      transition={SPRING_PRESS}
      className={`grid size-8 w-8 shrink-0 place-items-center rounded-lg border border-transparent bg-transparent p-0 text-sw-ink-2 transition-colors hover:bg-sw-surface-2 hover:text-sw-ink ${className}`}
      {...rest}
    >
      <Icon aria-hidden className="size-4" />
    </motion.button>
  );
}
