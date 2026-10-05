import { motion } from "motion/react";
import { useId } from "react";
import { SPRING } from "../constants/toolkit.ts";
import { BADGE_TEXT } from "../constants/ui.ts";
import type { SegmentedProps } from "../types/toolkit.ts";

/** A row of choices; the dark pill glides to the one picked. */
export function Segmented<T extends string>({ options, value, onChange, label }: SegmentedProps<T>) {
  const id = useId();

  return (
    <div
      role="tablist"
      aria-label={label}
      className="flex min-w-0 gap-0.5 self-start rounded-full bg-sw-surface-2 p-0.5"
    >
      {options.map((option) => {
        const on = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={on}
            title={option.title}
            className={`relative h-6 w-auto min-w-0 rounded-full border-0 bg-transparent px-2.5 font-semibold text-[11.5px] transition-colors ${on ? "text-sw-bg" : "text-sw-ink-3 hover:text-sw-ink"}`}
            onClick={() => onChange(option.value)}
          >
            {on && (
              <motion.span
                layoutId={`${id}-pill`}
                transition={SPRING}
                className="absolute inset-0 rounded-full bg-sw-ink"
              />
            )}
            <span className={`relative ${BADGE_TEXT}`}>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
