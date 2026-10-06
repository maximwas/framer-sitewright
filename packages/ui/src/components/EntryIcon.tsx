import type { LucideIcon } from "lucide-react";
import { Eye, TriangleAlert } from "lucide-react";
import { CATEGORY_BADGES, FALLBACK_ENTRY_ICON, OUTCOME_DOTS, SKILL_ICON } from "../constants/ui.ts";
import { IconTile } from "../toolkit/IconTile.tsx";
import type { EntryIconProps } from "../types/props.ts";
import type { Tone } from "../types/toolkit.ts";
import { operationIcon } from "../utils/operation-icon.ts";

/**
 * The entry's tile: a book for a skill, an eye for a read, the icon of what a change touched first, else of the
 * operation it ran; a failed call is a red warning, and one that went only partly well wears an amber dot.
 */
export function EntryIcon({ entry }: EntryIconProps) {
  const [main] = entry.categories;
  let icon: LucideIcon =
    main === undefined ? (operationIcon(entry.operation) ?? FALLBACK_ENTRY_ICON) : CATEGORY_BADGES[main.category].icon;
  let tone: Tone = "neutral";
  let label = "Change";

  if (entry.kind === "skill") {
    icon = SKILL_ICON;
    tone = "warn";
    label = "Skill";
  } else if (entry.effect === "read") {
    icon = Eye;
    label = "Read";
  }

  if (entry.outcome === "failed") {
    return <IconTile icon={TriangleAlert} tone="danger" label="Failed" />;
  }

  return <IconTile icon={icon} tone={tone} dot={OUTCOME_DOTS[entry.outcome]} label={label} />;
}
