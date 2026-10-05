import { motion } from "motion/react";
import { BUTTON_SIZES, BUTTON_VARIANTS, SPRING_PRESS } from "../constants/toolkit.ts";
import type { ButtonProps } from "../types/toolkit.ts";

/** A button that gives under the finger. */
export function Button({
  variant = "secondary",
  size = "md",
  icon: Icon,
  children,
  className = "",
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <motion.button
      type={type}
      {...(rest.disabled ? {} : { whileTap: { scale: 0.96 } })}
      transition={SPRING_PRESS}
      className={`inline-flex w-auto min-w-0 shrink-0 items-center justify-center gap-1.5 font-semibold transition-colors disabled:cursor-default disabled:opacity-40 ${BUTTON_SIZES[size]} ${BUTTON_VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {Icon !== undefined && <Icon aria-hidden className="size-3.5 shrink-0" />}
      {children !== undefined && <span className="truncate">{children}</span>}
    </motion.button>
  );
}
