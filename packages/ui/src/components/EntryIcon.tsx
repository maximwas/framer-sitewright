import { Eye } from "lucide-react";
import { OUTCOME_DOT_COLORS, SKILL_ICON } from "../constants/ui.ts";
import type { EntryIconProps } from "../types/props.ts";

/** A book for a skill, an eye for a read that worked, the outcome's colored dot for the rest. */
export function EntryIcon({ entry }: EntryIconProps) {
  if (entry.kind === "skill") {
    return <SKILL_ICON aria-label="Skill" className="size-3.5 shrink-0 text-framer-text-tertiary" />;
  }

  if (entry.effect === "read" && entry.outcome === "ok") {
    return <Eye aria-label="Read" className="size-3.5 shrink-0 text-framer-text-tertiary" />;
  }

  return <span className={`mx-[3px] size-2 shrink-0 rounded-full ${OUTCOME_DOT_COLORS[entry.outcome]}`} />;
}
