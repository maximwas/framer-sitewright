import { Check, Copy } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { COPIED_MS, FADE, SPRING_PRESS } from "../constants/toolkit.ts";
import type { CopyFieldProps } from "../types/toolkit.ts";

/** A command to run in a terminal, on the site's terminal pill, with a button that copies it. */
export function CopyField({ text, copy }: CopyFieldProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timer = setTimeout(() => setCopied(false), COPIED_MS);

    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <div className="flex items-center gap-1 rounded-lg bg-sw-ink py-1 pr-1 pl-2.5">
      <code className="min-w-0 flex-1 select-all break-words font-mono text-[11px] text-sw-bg leading-snug">
        {text}
      </code>
      <motion.button
        type="button"
        whileTap={{ scale: 0.94 }}
        transition={SPRING_PRESS}
        aria-label={copied ? "Copied" : `Copy ${text}`}
        className="relative flex h-6 w-auto shrink-0 items-center overflow-hidden rounded-md border-0 bg-sw-bg/15 px-2 font-semibold text-[11px] text-sw-bg hover:bg-sw-bg/25"
        onClick={async () => setCopied(await copy(text))}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={copied ? "done" : "copy"}
            className="flex items-center gap-1"
            initial={{
              y: 10,
              opacity: 0,
            }}
            animate={{
              y: 0,
              opacity: 1,
            }}
            exit={{
              y: -10,
              opacity: 0,
            }}
            transition={FADE}
          >
            {copied ? <Check aria-hidden className="size-3" /> : <Copy aria-hidden className="size-3" />}
            {copied ? "Copied" : "Copy"}
          </motion.span>
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
