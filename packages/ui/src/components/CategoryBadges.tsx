import { CATEGORY_BADGES } from "../constants/ui.ts";
import type { CategoryBadgesProps } from "../types/props.ts";

/** The legend of an entry's chips: which kinds of change they went through, as icons with their names. */
export function CategoryBadges({ categories }: CategoryBadgesProps) {
  return (
    <ul className="flex flex-wrap gap-x-2.5 gap-y-1">
      {categories.map(({ category }) => {
        const { icon: Icon, label } = CATEGORY_BADGES[category];

        return (
          <li key={category} className="flex items-center gap-1 text-[10px] text-framer-text-secondary">
            <Icon aria-hidden className="size-3" />
            {label}
          </li>
        );
      })}
    </ul>
  );
}
