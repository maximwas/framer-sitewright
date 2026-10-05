import { LAYER_BADGES } from "../constants/ui.ts";
import { Tag } from "../toolkit/Tag.tsx";
import type { LayerBadgeProps } from "../types/props.ts";

/** How the call reached Framer: Plugin API, Server API or Framer agent. */
export function LayerBadge({ layer }: LayerBadgeProps) {
  const { label, title, tone } = LAYER_BADGES[layer];

  return (
    <Tag tone={tone} title={title}>
      {label}
    </Tag>
  );
}
