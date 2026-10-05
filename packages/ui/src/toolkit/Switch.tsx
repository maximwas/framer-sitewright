import { motion } from "motion/react";
import { SPRING } from "../constants/toolkit.ts";
import type { SwitchProps } from "../types/toolkit.ts";

/** An on/off switch whose knob springs across. */
export function Switch({ checked, disabled = false, label, onToggle }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={`relative flex h-5 w-9 shrink-0 items-center rounded-full border-0 p-0.5 transition-colors disabled:opacity-40 ${checked ? "justify-end bg-sw-ok" : "justify-start bg-sw-line-strong"}`}
      onClick={onToggle}
    >
      <motion.span layout transition={SPRING} className="size-4 rounded-full bg-white shadow" />
    </button>
  );
}
