import { TONE_DOTS, TONE_TEXT } from "../constants/toolkit.ts";
import { BADGE_TEXT } from "../constants/ui.ts";
import type { StatusPillProps } from "../types/toolkit.ts";

/**
 * Where a connection stands: a dot and a word; a ring pulses out of the dot while the connection is live. The pulse is
 * a CSS animation: the status re-renders every second, and a motion keyframe animation restarted (blinked) each time.
 */
export function StatusPill({ tone, live = false, children }: StatusPillProps) {
  return (
    <span
      role="status"
      className={`inline-flex min-w-0 items-center gap-1.5 font-semibold text-[11.5px] ${TONE_TEXT[tone]}`}
    >
      <span className={`relative size-[7px] shrink-0 rounded-full ${TONE_DOTS[tone]}`}>
        {live && <span aria-hidden className={`absolute inset-0 animate-sw-pulse rounded-full ${TONE_DOTS[tone]}`} />}
      </span>
      <span className={`truncate py-1 ${BADGE_TEXT}`}>{children}</span>
    </span>
  );
}
