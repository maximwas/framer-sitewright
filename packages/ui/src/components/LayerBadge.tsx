import { BADGE_TEXT, LAYER_BADGES } from "../constants/ui.ts";
import type { LayerBadgeProps } from "../types/props.ts";

/** How the call reached Framer: Plugin API, Server API or Framer agent. */
export function LayerBadge({ layer }: LayerBadgeProps) {
  const { label, title, className } = LAYER_BADGES[layer];

  return (
    <span
      title={title}
      className={`flex h-[18px] shrink-0 items-center rounded-md px-1.5 font-semibold text-[10px] ${className}`}
    >
      <span className={BADGE_TEXT}>{label}</span>
    </span>
  );
}
