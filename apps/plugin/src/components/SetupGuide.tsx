import { Collapse, CopyField } from "@sitewright/ui";
import { ChevronDown } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { SETUP_STEPS } from "../constants/setup.ts";
import { copyText } from "../framer/plugin.ts";
import type { SetupGuideProps } from "../types/ui.ts";

/** How to set Sitewright up: the setup wizard's command, and this project's optional key. */
export function SetupGuide({ initiallyOpen }: SetupGuideProps) {
  const [open, setOpen] = useState(initiallyOpen);

  return (
    <section className="flex flex-col rounded-xl border border-sw-line">
      <button
        type="button"
        aria-expanded={open}
        className="flex h-auto w-full items-center gap-2 rounded-xl border-0 bg-transparent px-3 py-2.5 text-left font-semibold text-[12.5px] text-sw-ink hover:bg-sw-surface-2/60"
        onClick={() => setOpen(!open)}
      >
        <span className="flex-1">Set up</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} className="grid place-items-center text-sw-ink-3">
          <ChevronDown aria-hidden className="size-4" />
        </motion.span>
      </button>
      <Collapse open={open}>
        <ol className="flex flex-col gap-3 px-3 pt-1 pb-3">
          {SETUP_STEPS.map(({ title, note, command }, index) => (
            <motion.li
              key={title}
              className="flex gap-2.5"
              initial={{
                opacity: 0,
                y: 6,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{ delay: 0.05 + index * 0.06 }}
            >
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-sw-accent-soft font-mono font-semibold text-[10px] text-sw-accent-ink">
                {index + 1}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <h2 className="font-semibold text-[12px] text-sw-ink">{title}</h2>
                <p className="text-[11.5px] text-sw-ink-3">{note}</p>
                <CopyField text={command} copy={copyText} />
              </div>
            </motion.li>
          ))}
        </ol>
      </Collapse>
    </section>
  );
}
