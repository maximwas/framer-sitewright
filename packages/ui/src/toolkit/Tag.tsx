import { TONE_CLASSES } from "../constants/toolkit.ts";
import { BADGE_TEXT } from "../constants/ui.ts";
import type { TagProps } from "../types/toolkit.ts";

/** A small rounded label: Plugin API, Server API, a count. */
export function Tag({ tone, title, children }: TagProps) {
  return (
    <span
      title={title}
      className={`inline-flex h-[18px] shrink-0 items-center rounded-full px-2 font-semibold text-[10.5px] ${TONE_CLASSES[tone]}`}
    >
      <span className={BADGE_TEXT}>{children}</span>
    </span>
  );
}
