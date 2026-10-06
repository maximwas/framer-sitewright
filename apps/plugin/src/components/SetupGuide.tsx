import { CopyField } from "@sitewright/ui";
import { motion } from "motion/react";
import { SETUP_STEPS } from "../constants/setup.ts";
import { copyText } from "../framer/plugin.ts";

/** How to set Sitewright up: the setup wizard's command, and this project's optional key. Always open. */
export function SetupGuide() {
  return (
    <section className="flex flex-col rounded-xl border border-sw-line">
      <h2 className="px-3 pt-2.5 pb-1 font-semibold text-[12.5px] text-sw-ink">Set up</h2>
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
              <h3 className="font-semibold text-[12px] text-sw-ink">{title}</h3>
              <p className="text-[11.5px] text-sw-ink-3">{note}</p>
              <CopyField text={command} copy={copyText} />
            </div>
          </motion.li>
        ))}
      </ol>
    </section>
  );
}
